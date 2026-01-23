require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const app = express();
const server = http.createServer(app);

// Build allowed origins from environment variable
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

// Also add localhost variants for development
if (!allowedOrigins.includes('http://localhost:5173')) {
    allowedOrigins.push('http://localhost:5173');
}
if (!allowedOrigins.includes('http://localhost:5174')) {
    allowedOrigins.push('http://localhost:5174');
}

console.log('🔒 CORS allowed origins:', allowedOrigins);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow allowedOrigins, any ngrok domain, AND any vercel.app domain
        if (allowedOrigins.indexOf(origin) === -1 && !origin.includes('ngrok') && !origin.includes('.vercel.app')) {
            console.warn('⚠️ CORS blocked origin:', origin);
            return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// =====================================
// WHATSAPP CLIENT
// =====================================
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client-one",
        dataPath: "./.wwebjs_auth"
    }),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu"
        ],
    },
});

// QR Code
client.on("qr", (qr) => {
    console.log("📲 Escaneie o QR Code abaixo:");
    qrcode.generate(qr, { small: true });
    io.emit('qr', qr); // Send to frontend
});

// Ready
// Global cache for departments
let departmentsCache = {};

client.on("ready", async () => {
    console.log("✅ Tudo certo! WhatsApp conectado.");
    io.emit('ready');

    // Load departments
    try {
        const { data: depts, error } = await supabase
            .from('departments')
            .select('id, name');

        if (depts) {
            depts.forEach(d => {
                departmentsCache[d.name] = d.id;
            });
            console.log("📂 Departamentos carregados:", Object.keys(departmentsCache));
        }
    } catch (err) {
        console.error("Erro ao carregar departamentos:", err);
    }
});

// ... (disconnected handler remains same)

// Helper to check for active assignment
async function hasActiveAssignment(conversationId) {
    const { data } = await supabase
        .from('conversation_assignments')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('status', 'active')
        .single();
    return !!data;
}

// Helper to find available agent (simplified round-robin or random for now)
async function findAvailableAgent(departmentId) {
    // Find agents in this department who are active
    const { data: agents } = await supabase
        .from('agents')
        .select(`
            id,
            agent_departments!inner (
                department_id
            )
        `)
        .eq('status', 'active')
        .eq('agent_departments.department_id', departmentId);

    if (agents && agents.length > 0) {
        // Pick one randomly
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        return randomAgent.id;
    }
    return null;
}

// Helper to get or create active ticket
async function getOrCreateActiveTicket(conversationId, departmentId = null, agentId = null) {
    console.log('[TICKET] Looking for active ticket:', { conversationId, departmentId, agentId });

    // 1. Check for open ticket
    const { data: activeTicket, error: findError } = await supabase
        .from('tickets')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'open')
        .single();

    console.log('[TICKET] Query result:', { activeTicket, findError });

    if (activeTicket) {
        console.log('[TICKET] Found existing active ticket:', activeTicket.id);
        return activeTicket;
    }

    // 2. Create new ticket if none exists
    console.log('[TICKET] No active ticket found, creating new one');
    const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
            conversation_id: conversationId,
            status: 'open',
            department_id: departmentId,
            agent_id: agentId
        })
        .select()
        .single();

    if (error) {
        console.error("[TICKET] Error creating ticket:", error);
        return null;
    }

    console.log('[TICKET] Created new ticket:', newTicket.id);
    return newTicket;
}

// Helper to save message to Supabase (Updated for Tickets)
async function saveMessageToSupabase(conversationId, msg, ticketId = null) {
    try {
        const timestamp = new Date(msg.timestamp * 1000).toISOString();

        // If no ticketId provided, try to find active one
        if (!ticketId) {
            const ticket = await getOrCreateActiveTicket(conversationId);
            ticketId = ticket?.id;
        }

        const { error } = await supabase
            .from('messages')
            .upsert({
                conversation_id: conversationId,
                ticket_id: ticketId, // Associate with ticket
                message_id: msg.id._serialized,
                from_me: msg.fromMe,
                body: msg.body,
                timestamp: timestamp,
                has_media: msg.hasMedia,
                media_type: msg.type
            }, { onConflict: 'message_id' });

        if (error) {
            console.error("Error saving message:", error);
        } else {
            // Update conversation timestamp
            await supabase
                .from('conversations')
                .update({ last_message_at: timestamp })
                .eq('id', conversationId);

            // Emit to frontend
            const socketPayload = {
                id: { _serialized: msg.id._serialized },
                fromMe: msg.fromMe,
                body: msg.body,
                timestamp: msg.timestamp,
                hasMedia: msg.hasMedia,
                type: msg.type,
                from: msg.from || (msg.fromMe ? 'me' : null),
                to: msg.to,
                ticketId: ticketId
            };
            io.emit('message', socketPayload);
        }
    } catch (err) {
        console.error("Error saving message to Supabase:", err);
    }
}

client.on("message", async (msg) => {
    try {
        if (!msg.from || msg.from.endsWith("@g.us")) return;
        const chat = await msg.getChat();
        if (chat.isGroup) return;

        // 1. Get or Create Conversation
        const contact = await msg.getContact();
        const realPhone = contact.number || chat.id.user;
        // Prefer address book name (contact.name) > pushname > chat name > phone
        const formattedName = contact.name || contact.pushname || chat.name || `+${realPhone}`;

        const { data: conversation } = await supabase
            .from('conversations')
            .upsert({
                chat_id: chat.id._serialized,
                name: formattedName,
                phone: realPhone,
                is_group: chat.isGroup,
                last_message_at: new Date(msg.timestamp * 1000).toISOString()
            }, { onConflict: 'chat_id' })
            .select()
            .single();

        if (!conversation) return;

        // 2. Ensure Ticket Exists
        const ticket = await getOrCreateActiveTicket(conversation.id);

        // Save incoming message (linked to ticket)
        await saveMessageToSupabase(conversation.id, msg, ticket?.id);

        // 3. Check assignments/department (Legacy logic adapted for tickets)
        // If ticket has agent_id, it is assigned.
        if (ticket && ticket.agent_id) {
            return; // Agent handles it
        }

        // 4. Department Selection Logic
        const body = msg.body.trim();
        const menuOptions = ['Fiscal', 'Contábil', 'DP', 'Societário', 'Financeiro'];
        const selection = parseInt(body);

        if (!isNaN(selection) && selection >= 1 && selection <= 5) {
            const selectedDeptName = menuOptions[selection - 1];
            const deptId = departmentsCache[selectedDeptName];

            if (deptId) {
                await chat.sendStateTyping();

                // Update Ticket with Department
                await supabase
                    .from('tickets')
                    .update({ department_id: deptId })
                    .eq('id', ticket.id);

                // Find Agent - DISABLED AUTO ASSIGNMENT
                // We want to keep it in the department queue visible to ALL agents of that department
                // until someone picks it up.
                const agentId = null; // await findAvailableAgent(deptId);

                // Check if assignment already exists for this conversation
                const { data: existingAssignment } = await supabase
                    .from('conversation_assignments')
                    .select('id')
                    .eq('conversation_id', conversation.id)
                    .order('assigned_at', { ascending: false })
                    .limit(1)
                    .single();

                if (existingAssignment) {
                    // Update existing assignment
                    await supabase
                        .from('conversation_assignments')
                        .update({
                            agent_id: agentId,
                            department_id: deptId,
                            status: 'active',
                            assigned_at: new Date().toISOString()
                        })
                        .eq('id', existingAssignment.id);
                } else {
                    // Create new assignment
                    await supabase.from('conversation_assignments').insert({
                        conversation_id: conversation.id,
                        agent_id: agentId,
                        department_id: deptId,
                        status: 'active'
                    });
                }

                // Update Ticket with Agent if found
                if (agentId) {
                    await supabase
                        .from('tickets')
                        .update({ agent_id: agentId })
                        .eq('id', ticket.id);
                }

                let replyMsg = `✅ Entendido! Ticket #${ticket.id.slice(0, 4)} iniciado para *${selectedDeptName}*.`;
                if (!agentId) {
                    replyMsg += `\n\nTodos os nossos atendentes estão ocupados no momento, mas sua mensagem já está na fila.`;
                } else {
                    replyMsg += `\n\nUm de nossos especialistas falará com você em breve.`;
                }

                const sentMsg1 = await client.sendMessage(msg.from, replyMsg);
                await saveMessageToSupabase(conversation.id, sentMsg1, ticket.id);
                return;
            }
        }

        // 5. Greeting / Menu (Only if no department assigned yet)
        if (!ticket.department_id) {
            await chat.sendStateTyping();
            await new Promise(r => setTimeout(r, 1500));

            const hora = new Date().getHours();
            let saudacao = "Olá";
            if (hora >= 5 && hora < 12) saudacao = "Bom dia";
            else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
            else saudacao = "Boa noite";

            const sentMsg2 = await client.sendMessage(
                msg.from,
                `${saudacao}! Bem-vindo à MWC Assessoria. 👋\n` +
                `Atendimento #${ticket.id.slice(0, 4)}\n\n` +
                `Para prosseguir, escolha o departamento:\n` +
                `1. Fiscal\n` +
                `2. Contábil\n` +
                `3. DP\n` +
                `4. Societário\n` +
                `5. Financeiro`
            );
            await saveMessageToSupabase(conversation.id, sentMsg2, ticket.id);
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
});

client.initialize();

// =====================================
// API ROUTES
// =====================================

// Get all chats
app.get('/api/chats', async (req, res) => {
    try {
        // Fetch from Supabase with active assignments
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select(`
                    *,
                    conversation_assignments (
                        agent_id,
                        status,
                        agents (
                            email
                        )
                    )
                `)
            .order('last_message_at', { ascending: false });

        if (error) throw error;

        // Map to wwebjs format expected by frontend
        const chats = conversations.map(c => {
            // Find active assignment
            const activeAssignment = c.conversation_assignments?.find(a => a.status === 'active');

            return {
                id: { _serialized: c.chat_id },
                conversationId: c.id,
                name: c.name,
                isGroup: c.is_group,
                unreadCount: c.unread_count,
                timestamp: c.last_message_at ? new Date(c.last_message_at).getTime() / 1000 : 0,
                agent_id: activeAssignment?.agent_id || null,
                agent_email: activeAssignment?.agents?.email || null
            };
        });

        res.json(chats);
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get messages for a specific chat
app.get('/api/messages/:chatId', async (req, res) => {
    try {
        const { ticketId } = req.query;

        // 1. Try to get conversation from Supabase
        const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('chat_id', req.params.chatId)
            .single();

        if (conversation) {
            let targetTicketId = ticketId;

            // If no specific ticket requested, find the ACTIVE one
            if (!targetTicketId) {
                const { data: activeTicket } = await supabase
                    .from('tickets')
                    .select('id')
                    .eq('conversation_id', conversation.id)
                    .eq('status', 'open')
                    .single();

                if (activeTicket) {
                    targetTicketId = activeTicket.id;
                }
            }

            let messages = [];
            if (targetTicketId) {
                const { data: ticketMessages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('ticket_id', targetTicketId)
                    .order('timestamp', { ascending: true });
                messages = ticketMessages || [];
            } else {
                // No active ticket = fresh start, return empty
                messages = [];
            }

            if (messages && messages.length > 0) {
                const mappedMessages = messages.map(m => ({
                    id: { _serialized: m.message_id },
                    fromMe: m.from_me,
                    body: m.body,
                    timestamp: new Date(m.timestamp).getTime() / 1000,
                    hasMedia: m.has_media,
                    type: m.media_type,
                    from: m.from_me ? (client.info ? client.info.wid._serialized : 'me') : req.params.chatId,
                    to: m.from_me ? req.params.chatId : (client.info ? client.info.wid._serialized : 'me'),
                    ticketId: m.ticket_id // Include ticket ID
                }));
                return res.json(mappedMessages);
            }
        }

        // Fallback: fetch from WhatsApp Web.js
        const chat = await client.getChatById(req.params.chatId);
        const limit = parseInt(req.query.limit) || 50;
        const messages = await chat.fetchMessages({ limit });
        res.json(messages);

    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
app.post('/api/send', async (req, res) => {
    const { chatId, message, agentEmail } = req.body;
    try {
        let messageToSend = message;

        // If agent email is provided, try to find the name and prepend it
        if (agentEmail) {
            const { data: agent } = await supabase
                .from('agents')
                .select('name')
                .eq('email', agentEmail)
                .single();

            if (agent && agent.name) {
                messageToSend = `*${agent.name}:*\n${message}`;
            }
        }

        const response = await client.sendMessage(chatId, messageToSend);

        // Save sent message to Supabase
        const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('chat_id', chatId)
            .single();

        if (conversation) {
            await saveMessageToSupabase(conversation.id, response);
        }

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get client info
app.get('/api/info', (req, res) => {
    if (client.info) {
        res.json(client.info);
    } else {
        res.status(404).json({ error: 'Client not ready' });
    }
});

// =====================================
// CONVERSATION MANAGEMENT ROUTES
// =====================================

// Get my conversations (for logged-in agent)
app.get('/api/conversations/my-conversations', async (req, res) => {
    try {
        const agentEmail = req.query.email; // Temporary - will use JWT later

        if (!agentEmail) {
            return res.status(400).json({ error: 'Agent email required' });
        }

        // Get agent ID and their departments
        const { data: agent } = await supabase
            .from('agents')
            .select(`
                id,
                agent_departments (
                    department_id
                )
            `)
            .eq('email', agentEmail)
            .single();

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        console.log('[MY-CONVERSATIONS] Agent:', agent.id);

        // Get department IDs
        const departmentIds = agent.agent_departments?.map(ad => ad.department_id) || [];

        // Build query using TICKETS table instead of assignments
        // This allows showing multiple tickets (history) for the same conversation
        let query = supabase
            .from('tickets')
            .select(`
                id,
                status,
                created_at,
                closed_at,
                agent_id,
                department_id,
                conversations (
                    id,
                    chat_id,
                    name,
                    phone,
                    last_message_at,
                    priority,
                    tags,
                    unread_count
                ),
                departments (
                    id,
                    name
                )
            `);

        // Filter: 
        // 1. Tickets assigned to ME (Open or Closed)
        // 2. Tickets unassigned (Open) but in MY DEPARTMENTS (Queue)

        let orFilter = `agent_id.eq.${agent.id}`;
        if (departmentIds.length > 0) {
            orFilter += `,and(agent_id.is.null,department_id.in.(${departmentIds.join(',')}),status.eq.open)`;
        }

        query = query.or(orFilter);

        const { data: tickets, error } = await query
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map tickets to the format expected by MyConversations.jsx
        // We simulate the "assignment" structure so the frontend keeps working
        const conversations = tickets.map(t => {
            let status = 'active';
            if (t.status === 'closed') status = 'closed';
            else if (!t.agent_id) status = 'queued';

            return {
                id: t.id, // Use Ticket ID as the list key
                status: status,
                assigned_at: t.created_at, // Use ticket creation as assignment time
                closed_at: t.closed_at,
                conversation_id: t.conversations?.id,
                agent_id: t.agent_id,
                department_id: t.department_id,
                conversations: t.conversations,
                departments: t.departments
            };
        });

        console.log('[MY-CONVERSATIONS] Tickets found:', conversations.length);

        res.json(conversations);
    } catch (error) {
        console.error('Error fetching my conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get conversations by department
app.get('/api/departments/:id/conversations', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: assignments, error } = await supabase
            .from('conversation_assignments')
            .select(`
                id,
                status,
                assigned_at,
                agent_id,
                conversation_id,
                conversations (
                    id,
                    chat_id,
                    name,
                    phone,
                    last_message_at,
                    priority,
                    unread_count
                ),
                agents (
                    id,
                    name,
                    email
                )
            `)
            .eq('department_id', id)
            .in('status', ['active', 'queued', 'closed'])
            .order('assigned_at', { ascending: false });

        if (error) throw error;

        res.json(assignments || []);
    } catch (error) {
        console.error('Error fetching department conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Assign conversation to me
app.post('/api/conversations/:id/assign-to-me', async (req, res) => {
    try {
        const { id } = req.params;
        const { agentEmail } = req.body;

        if (!agentEmail) {
            return res.status(400).json({ error: 'Agent email required' });
        }

        // Get agent ID
        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('email', agentEmail)
            .single();

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // 1. Check for currently ACTIVE assignment (anyone)
        const { data: activeAssignment } = await supabase
            .from('conversation_assignments')
            .select('*')
            .eq('conversation_id', id)
            .eq('status', 'active')
            .single();

        if (activeAssignment) {
            // If already assigned to ME, we are good
            if (activeAssignment.agent_id === agent.id) {
                return res.json(activeAssignment);
            }

            // If assigned to SOMEONE ELSE, close/transfer their assignment first
            // (Instead of changing agent_id, which might violate unique constraint if target agent has a row)
            await supabase
                .from('conversation_assignments')
                .update({ status: 'transferred', closed_at: new Date().toISOString() })
                .eq('id', activeAssignment.id);
        }

        // 2. Check if **I** have an existing assignment for this convo (active or closed)
        const { data: myAssignment } = await supabase
            .from('conversation_assignments')
            .select('*')
            .eq('conversation_id', id)
            .eq('agent_id', agent.id)
            .single();

        let finalAssignment;

        if (myAssignment) {
            // Reactivate MY existing row
            const { data, error } = await supabase
                .from('conversation_assignments')
                .update({
                    status: 'active',
                    assigned_at: new Date().toISOString(),
                    closed_at: null
                })
                .eq('id', myAssignment.id)
                .select()
                .single();

            if (error) throw error;
            finalAssignment = data;
        } else {
            // Create NEW assignment for me
            const { data, error } = await supabase
                .from('conversation_assignments')
                .insert({
                    conversation_id: id,
                    agent_id: agent.id,
                    status: 'active',
                    assigned_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            finalAssignment = data;
        }

        // 3. Update the Ticket to point to me
        const { data: activeTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('conversation_id', id)
            .eq('status', 'open')
            .single();

        if (activeTicket) {
            await supabase
                .from('tickets')
                .update({ agent_id: agent.id })
                .eq('id', activeTicket.id);
        }

        res.json(finalAssignment);

    } catch (error) {
        console.error('Error assigning conversation:', error);
        res.status(500).json({ error: 'Failed to assign conversation', details: error.message });
    }
});

// Close/finish conversation (Close Ticket)
app.post('/api/conversations/:id/close', async (req, res) => {
    console.log('[CLOSE] Request received:', { conversationId: req.params.id, body: req.body });
    try {
        const { id } = req.params;
        const { agentEmail } = req.body;

        if (!agentEmail) {
            console.log('[CLOSE] Missing agent email');
            return res.status(400).json({ error: 'Agent email required' });
        }

        // Get conversation details
        const { data: conversation } = await supabase
            .from('conversations')
            .select('chat_id')
            .eq('id', id)
            .single();

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Get active ticket
        console.log('[CLOSE] Looking for active ticket for conversation:', id);
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('id')
            .eq('conversation_id', id)
            .eq('status', 'open')
            .single();

        console.log('[CLOSE] Ticket query result:', { ticket, ticketError });

        if (ticketError || !ticket) {
            console.log('[CLOSE] No active ticket found');
            return res.status(404).json({ error: 'No active ticket found to close' });
        }

        // Close ticket
        console.log('[CLOSE] Closing ticket:', ticket.id);
        const { error: closeError } = await supabase
            .from('tickets')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('id', ticket.id);

        if (closeError) {
            console.error('[CLOSE] Error closing ticket:', closeError);
            throw closeError;
        }

        // Close active assignments
        console.log('[CLOSE] Closing assignments for conversation:', id);
        await supabase
            .from('conversation_assignments')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('conversation_id', id)
            .eq('status', 'active');

        // Send closure message to WhatsApp
        try {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('pt-BR');

            const closureMessage = `✓ *Atendimento Encerrado*\n\n` +
                `Ticket #${ticket.id.slice(0, 8)}\n` +
                `Encerrado em: ${dateStr} às ${timeStr}\n\n` +
                `Obrigado por entrar em contato com a MWC Assessoria! 🙏`;

            const sentMsg = await client.sendMessage(conversation.chat_id, closureMessage);

            // Save closure message to database
            await saveMessageToSupabase(id, sentMsg, ticket.id);
        } catch (msgError) {
            console.error('[CLOSE] Error sending closure message:', msgError);
            // Don't fail the close operation if message fails
        }

        console.log('[CLOSE] Ticket closed successfully');
        res.json({ message: 'Ticket closed successfully' });
    } catch (error) {
        console.error('[CLOSE] Error closing conversation:', error);
        res.status(500).json({ error: 'Failed to close conversation' });
    }
});

// Transfer conversation
app.post('/api/conversations/:id/transfer', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetAgentId, agentEmail } = req.body;

        if (!agentEmail || !targetAgentId) {
            return res.status(400).json({ error: 'Agent email and target agent ID required' });
        }

        // Get requesting agent (security check - ensure valid sender)
        const { data: sender } = await supabase
            .from('agents')
            .select('id')
            .eq('email', agentEmail)
            .single();

        if (!sender) {
            return res.status(404).json({ error: 'Requesting agent not found' });
        }

        // 1. Find CURRENT active assignment
        const { data: currentAssignment } = await supabase
            .from('conversation_assignments')
            .select('*')
            .eq('conversation_id', id)
            .eq('status', 'active')
            .single();

        if (currentAssignment) {
            // Close it (Transfer OUT)
            await supabase
                .from('conversation_assignments')
                .update({
                    status: 'transferred',
                    closed_at: new Date().toISOString()
                })
                .eq('id', currentAssignment.id);
        }

        // 2. Check if TARGET agent already has history
        const { data: targetHistory } = await supabase
            .from('conversation_assignments')
            .select('*')
            .eq('conversation_id', id)
            .eq('agent_id', targetAgentId)
            .single();

        let newAssignment;

        if (targetHistory) {
            // Reactivate TARGET's existing row (Transfer IN)
            const { data, error } = await supabase
                .from('conversation_assignments')
                .update({
                    status: 'active',
                    assigned_at: new Date().toISOString(),
                    closed_at: null
                })
                .eq('id', targetHistory.id)
                .select()
                .single();

            if (error) throw error;
            newAssignment = data;
        } else {
            // Create NEW assignment for TARGET
            const { data, error } = await supabase
                .from('conversation_assignments')
                .insert({
                    conversation_id: id,
                    agent_id: targetAgentId,
                    status: 'active',
                    assigned_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            newAssignment = data;
        }

        // 3. Update the main Ticket
        const { data: activeTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('conversation_id', id)
            .eq('status', 'open')
            .single();

        if (activeTicket) {
            await supabase
                .from('tickets')
                .update({ agent_id: targetAgentId })
                .eq('id', activeTicket.id);
        }

        res.json(newAssignment);
    } catch (error) {
        console.error('Error transferring conversation:', error);
        res.status(500).json({ error: 'Failed to transfer conversation', details: error.message });
    }
});

// Update conversation details (name, company, phone, priority)
app.put('/api/conversations/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, company, phone, priority } = req.body;

        const updates = { name, company };

        if (priority) {
            updates.priority = priority;
        }

        if (phone) {
            // Sanitize phone (keep only digits)
            const cleanPhone = phone.replace(/\D/g, '');
            updates.phone = cleanPhone;
            updates.chat_id = `${cleanPhone}@c.us`;
        }

        const { data, error } = await supabase
            .from('conversations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error updating conversation details:', error);
        res.status(500).json({ error: 'Failed to update details' });
    }
});

// =====================================
// AGENT MANAGEMENT ROUTES
// =====================================

// Register new agent
app.post('/api/agents', async (req, res) => {
    const { name, email, phone, departmentIds } = req.body;

    try {
        // Create agent
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .insert({ name, email, phone })
            .select()
            .single();

        if (agentError) throw agentError;

        // Assign departments
        if (departmentIds && departmentIds.length > 0) {
            const assignments = departmentIds.map(deptId => ({
                agent_id: agent.id,
                department_id: deptId
            }));

            const { error: assignError } = await supabase
                .from('agent_departments')
                .insert(assignments);

            if (assignError) throw assignError;
        }

        res.json(agent);
    } catch (error) {
        console.error('Agent registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update agent
app.put('/api/agents/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, departmentIds } = req.body;

    try {
        // 1. Update agent details
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .update({ name, email, phone })
            .eq('id', id)
            .select()
            .single();

        if (agentError) throw agentError;

        // 2. Update departments (Delete existing, then insert new)
        if (departmentIds) {
            // Delete existing
            const { error: deleteError } = await supabase
                .from('agent_departments')
                .delete()
                .eq('agent_id', id);

            if (deleteError) throw deleteError;

            // Insert new
            if (departmentIds.length > 0) {
                const assignments = departmentIds.map(deptId => ({
                    agent_id: id,
                    department_id: deptId
                }));

                const { error: insertError } = await supabase
                    .from('agent_departments')
                    .insert(assignments);

                if (insertError) throw insertError;
            }
        }

        res.json(agent);
    } catch (error) {
        console.error('Agent update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete agent
app.delete('/api/agents/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Delete associations in agent_departments
        const { error: deptError } = await supabase
            .from('agent_departments')
            .delete()
            .eq('agent_id', id);

        if (deptError) throw deptError;

        // 2. Delete the agent
        const { error: agentError } = await supabase
            .from('agents')
            .delete()
            .eq('id', id);

        if (agentError) throw agentError;

        res.json({ message: 'Agent deleted successfully' });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all agents with their departments
app.get('/api/agents', async (req, res) => {
    try {
        const { data: agents, error } = await supabase
            .from('agents')
            .select(`
                *,
                agent_departments (
                    department_id,
                    departments (
                        id,
                        name
                    )
                )
            `);

        if (error) throw error;

        // DEBUG: Log raw data
        console.log("Raw agents data:", JSON.stringify(agents, null, 2));

        // Flatten departments structure
        const formattedAgents = agents.map(agent => ({
            ...agent,
            departments: agent.agent_departments?.map(ad => ad.departments).filter(Boolean) || []
        }));

        // DEBUG: Log formatted data
        console.log("Formatted agents:", JSON.stringify(formattedAgents, null, 2));

        res.json(formattedAgents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get agents with statistics
app.get('/api/agents/stats', async (req, res) => {
    console.log('[API] GET /api/agents/stats called');
    try {
        const { data: agents, error } = await supabase
            .from('agents')
            .select(`
                *,
                agent_departments (
                    departments (
                        id,
                        name
                    )
                )
            `);

        if (error) {
            console.error('[API] Supabase error fetching agents:', error);
            throw error;
        }

        console.log(`[API] Found ${agents?.length} agents in DB`);

        // Get conversation counts for each agent
        const agentsWithStats = await Promise.all(agents.map(async (agent) => {
            // Count total conversations assigned to this agent
            const { count: totalCount } = await supabase
                .from('conversation_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('agent_id', agent.id);

            // Count active conversations
            const { count: activeCount } = await supabase
                .from('conversation_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('agent_id', agent.id)
                .eq('status', 'active');

            return {
                ...agent,
                departments: agent.agent_departments?.map(ad => ad.departments).filter(Boolean) || [],
                total_conversations: totalCount || 0,
                active_conversations: activeCount || 0
            };
        }));

        console.log('[API] Sending agents stats:', JSON.stringify(agentsWithStats.map(a => a.name)));
        res.json(agentsWithStats);
    } catch (error) {
        console.error('[API] Error in /api/agents/stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all departments
app.get('/api/departments', async (req, res) => {
    try {
        const { data: departments, error } = await supabase
            .from('departments')
            .select('*')
            .order('name');

        if (error) throw error;
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// AUTHENTICATION ROUTE
// =====================================

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('[LOGIN ATTEMPT]', { email, password }); // DEBUG LOG

    try {
        // Check super user
        if (email === 'mwc.assessoria@gmail.com' && password === 'Mwc2015') {
            return res.json({
                success: true,
                user: {
                    email: 'mwc.assessoria@gmail.com',
                    name: 'Super Admin',
                    role: 'super_admin'
                }
            });
        }

        // Check against agents table
        const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('email', email)
            .eq('status', 'active')
            .single();

        if (error || !agent) {
            return res.status(401).json({
                success: false,
                error: 'Email ou senha inválidos'
            });
        }

        // Check if first login (no password set)
        if (!agent.password_hash || agent.first_login) {
            return res.json({
                success: true,
                firstLogin: true,
                user: {
                    id: agent.id,
                    email: agent.email,
                    name: agent.name,
                    role: 'agent'
                }
            });
        }

        // Validate password (in production, use bcrypt.compare)
        if (agent.password_hash === password) {
            return res.json({
                success: true,
                firstLogin: false,
                user: {
                    id: agent.id,
                    email: agent.email,
                    name: agent.name,
                    role: 'agent'
                }
            });
        }

        res.status(401).json({
            success: false,
            error: 'Email ou senha inválidos'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao fazer login'
        });
    }
});

// Set password for first-time login
app.post('/api/agents/set-password', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Update agent password
        const { data, error } = await supabase
            .from('agents')
            .update({
                password_hash: password, // In production, use bcrypt.hash(password, 10)
                first_login: false
            })
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            user: {
                id: data.id,
                email: data.email,
                name: data.name,
                role: 'agent'
            }
        });
    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao definir senha'
        });
    }
});

// =====================================
// CLIENT ROUTES
// =====================================

// Get all clients (conversations)
app.get('/api/clients', async (req, res) => {
    try {
        const { search } = req.query;
        let query = supabase
            .from('conversations')
            .select('*')
            // .eq('status', 'active') // OLD strict way
            .neq('status', 'deleted') // NEW robust way (keeps NULLs active)
            .order('name', { ascending: true });

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Soft delete client
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('conversations')
            .update({ status: 'deleted' })
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// Create new client
app.post('/api/clients', async (req, res) => {
    try {
        const { name, phone, company } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        // Format phone to 55 + number
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const chatId = `${formattedPhone}@c.us`;

        // Check if exists
        const { data: existing } = await supabase
            .from('conversations')
            .select('*')
            .eq('chat_id', chatId)
            .single();

        if (existing) {
            // Update if exists
            const { data, error } = await supabase
                .from('conversations')
                .update({ name, company })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return res.json(data);
        }

        // Create if new
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                name,
                phone: formattedPhone,
                company,
                chat_id: chatId,
                is_group: false
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);

    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, company } = req.body;

        const updates = { name, company };

        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            updates.phone = cleanPhone;
            updates.chat_id = `${cleanPhone}@c.us`;
        }

        const { data, error } = await supabase
            .from('conversations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Get client ticket history
app.get('/api/clients/:chatId/history', async (req, res) => {
    try {
        const { chatId } = req.params;

        // Find conversation first
        const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('chat_id', chatId)
            .single();

        if (!conversation) return res.json([]);

        // Get tickets
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select(`
                *,
                agents (name, email),
                departments (name)
            `)
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
