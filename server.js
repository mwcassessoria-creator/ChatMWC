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
const io = new Server(server, {
    cors: {
        origin: "*", // Temporarily allow all for debugging
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

app.use(cors({
    origin: "*" // Temporarily allow all for debugging
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

// Helper to save message to Supabase
async function saveMessageToSupabase(conversationId, msg) {
    try {
        const timestamp = new Date(msg.timestamp * 1000).toISOString();

        const { error } = await supabase
            .from('messages')
            .upsert({
                conversation_id: conversationId,
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

            // Emit to frontend for real-time update
            const socketPayload = {
                id: { _serialized: msg.id._serialized },
                fromMe: msg.fromMe,
                body: msg.body,
                timestamp: msg.timestamp,
                hasMedia: msg.hasMedia,
                type: msg.type,
                from: msg.from || (msg.fromMe ? 'me' : null),
                to: msg.to
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

        // 1. Get or Create Conversation to ensure we have UUID
        const { data: conversation } = await supabase
            .from('conversations')
            .upsert({
                chat_id: chat.id._serialized,
                name: chat.name || chat.id.user,
                phone: chat.id.user,
                is_group: chat.isGroup,
                last_message_at: new Date(msg.timestamp * 1000).toISOString()
            }, { onConflict: 'chat_id' })
            .select()
            .single();

        if (!conversation) return;

        // Save incoming message to Supabase
        await saveMessageToSupabase(conversation.id, msg);

        // 2. Check if already assigned (Human agent handling it)
        const isAssigned = await hasActiveAssignment(conversation.id);
        if (isAssigned) {
            // If assigned, we DO NOT auto-reply. The agent handles it.
            return;
        }

        // 3. Check for Department Selection (1-5)
        const body = msg.body.trim();
        const menuOptions = ['Fiscal', 'Contábil', 'DP', 'Societário', 'Financeiro'];
        const selection = parseInt(body);

        if (!isNaN(selection) && selection >= 1 && selection <= 5) {
            const selectedDeptName = menuOptions[selection - 1];
            const deptId = departmentsCache[selectedDeptName];

            if (deptId) {
                await chat.sendStateTyping();

                // Try to find an agent
                const agentId = await findAvailableAgent(deptId);

                // Create Assignment (even if agentId is null - meaning "Queued")
                await supabase.from('conversation_assignments').insert({
                    conversation_id: conversation.id,
                    agent_id: agentId, // If null, it's just in the department queue
                    status: 'active'
                });

                let replyMsg = `✅ Entendido! Transferindo para o setor *${selectedDeptName}*.`;
                if (!agentId) {
                    replyMsg += `\n\nTodos os nossos atendentes estão ocupados no momento, mas sua mensagem já está na fila.`;
                } else {
                    replyMsg += `\n\nUm de nossos especialistas falará com você em breve.`;
                }

                const sentMsg1 = await client.sendMessage(msg.from, replyMsg);
                await saveMessageToSupabase(conversation.id, sentMsg1);
                return;
            }
        }

        // 4. Greeting / Menu (Only if not assigned and not a valid selection)
        if (/^(menu|oi|olá|ola|bom dia|boa tarde|boa noite|inicio|start)$/i.test(body)) {
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
                `Com qual departamento deseja falar?\n\n` +
                `1. Fiscal\n` +
                `2. Contábil\n` +
                `3. DP\n` +
                `4. Societário\n` +
                `5. Financeiro`
            );
            await saveMessageToSupabase(conversation.id, sentMsg2);
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
        // Fetch from Supabase to support persistence/offline
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (error) throw error;

        // Map to wwebjs format expected by frontend
        const chats = conversations.map(c => ({
            id: { _serialized: c.chat_id },
            conversationId: c.id,
            name: c.name,
            isGroup: c.is_group,
            unreadCount: c.unread_count,
            timestamp: c.last_message_at ? new Date(c.last_message_at).getTime() / 1000 : 0
        }));

        res.json(chats);
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get messages for a specific chat
app.get('/api/messages/:chatId', async (req, res) => {
    try {
        // 1. Try to get conversation from Supabase
        const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('chat_id', req.params.chatId)
            .single();

        if (conversation) {
            // 2. Fetch messages from Supabase
            const { data: messages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversation.id)
                .order('timestamp', { ascending: true })
                .limit(parseInt(req.query.limit) || 50);

            if (messages && messages.length > 0) {
                const mappedMessages = messages.map(m => ({
                    id: { _serialized: m.message_id },
                    fromMe: m.from_me,
                    body: m.body,
                    timestamp: new Date(m.timestamp).getTime() / 1000,
                    hasMedia: m.has_media,
                    type: m.media_type,
                    from: m.from_me ? (client.info ? client.info.wid._serialized : 'me') : req.params.chatId,
                    to: m.from_me ? req.params.chatId : (client.info ? client.info.wid._serialized : 'me')
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

        // Get agent ID
        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('email', agentEmail)
            .single();

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Get conversations assigned to this agent
        const { data: assignments, error } = await supabase
            .from('conversation_assignments')
            .select(`
                id,
                status,
                assigned_at,
                conversation_id,
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
            `)
            .eq('agent_id', agent.id)
            .in('status', ['active', 'queued'])
            .order('assigned_at', { ascending: false });

        if (error) throw error;

        res.json(assignments || []);
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
            .in('status', ['active', 'queued'])
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

        // Update assignment
        const { data, error } = await supabase
            .from('conversation_assignments')
            .update({
                agent_id: agent.id,
                status: 'active',
                assigned_at: new Date().toISOString()
            })
            .eq('conversation_id', id)
            .is('agent_id', null)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: 'Conversation already assigned or not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error assigning conversation:', error);
        res.status(500).json({ error: 'Failed to assign conversation' });
    }
});

// Close/finish conversation
app.post('/api/conversations/:id/close', async (req, res) => {
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

        // Update assignment status
        const { data, error } = await supabase
            .from('conversation_assignments')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('conversation_id', id)
            .eq('agent_id', agent.id)
            .eq('status', 'active') // Only close active assignments
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error closing conversation:', error);
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

        // Get requesting agent ID
        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('email', agentEmail)
            .single();

        if (!agent) {
            return res.status(404).json({ error: 'Requesting agent not found' });
        }

        // Update assignment to new agent
        const { data, error } = await supabase
            .from('conversation_assignments')
            .update({
                agent_id: targetAgentId,
                assigned_at: new Date().toISOString() // Update assignment time? Optional.
            })
            .eq('conversation_id', id)
            .eq('status', 'active') // Only transfer active assignments
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error transferring conversation:', error);
        res.status(500).json({ error: 'Failed to transfer conversation' });
    }
});

// Update conversation details (name, company)
app.put('/api/conversations/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, company } = req.body;

        const { data, error } = await supabase
            .from('conversations')
            .update({ name, company })
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

        if (error) throw error;

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
                departments: agent.agent_departments?.map(ad => ad.departments) || [],
                total_conversations: totalCount || 0,
                active_conversations: activeCount || 0
            };
        }));

        res.json(agentsWithStats);
    } catch (error) {
        console.error('Error fetching agent stats:', error);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
