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
        origin: (origin, callback) => {
            const allowedOrigins = [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000",
                process.env.CORS_ORIGIN
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, true); // Permissive for now to avoid blocking
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            process.env.CORS_ORIGIN
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Permissive for now
        }
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
client.on("ready", () => {
    console.log("✅ Tudo certo! WhatsApp conectado.");
    io.emit('ready');
});

// Disconnected
client.on("disconnected", (reason) => {
    console.log("⚠️ Desconectado:", reason);
    io.emit('disconnected', reason);
});

// Message Handling - Save to Supabase
client.on("message_create", async (msg) => {
    try {
        const chat = await msg.getChat();

        // Save/update conversation
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

        // Save message
        if (conversation) {
            await supabase.from('messages').insert({
                conversation_id: conversation.id,
                message_id: msg.id._serialized,
                from_me: msg.fromMe,
                body: msg.body || '',
                timestamp: new Date(msg.timestamp * 1000).toISOString(),
                has_media: msg.hasMedia,
                media_type: msg.type
            });
        }
    } catch (error) {
        console.error('DB save error:', error.message);
    }

    // Always emit to frontend
    io.emit('message', msg);
});

// Also keep the auto-reply logic
client.on("message", async (msg) => {
    try {
        if (!msg.from || msg.from.endsWith("@g.us")) return;
        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const texto = msg.body ? msg.body.trim().toLowerCase() : "";

        if (/^(menu|oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(texto)) {
            await chat.sendStateTyping();
            await new Promise(r => setTimeout(r, 2000));

            const hora = new Date().getHours();
            let saudacao = "Olá";
            if (hora >= 5 && hora < 12) saudacao = "Bom dia";
            else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
            else saudacao = "Boa noite";

            await client.sendMessage(
                msg.from,
                `${saudacao}! Bem-vindo à MWC Assessoria. 👋\n` +
                `Com qual departamento deseja falar?\n\n` +
                `1. Fiscal\n` +
                `2. Contábil\n` +
                `3. DP\n` +
                `4. Societário\n` +
                `5. Financeiro`
            );
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
        const chats = await client.getChats();
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get messages for a specific chat
app.get('/api/messages/:chatId', async (req, res) => {
    try {
        const chat = await client.getChatById(req.params.chatId);
        const limit = parseInt(req.query.limit) || 50;
        const messages = await chat.fetchMessages({ limit });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
app.post('/api/send', async (req, res) => {
    const { chatId, message } = req.body;
    try {
        const response = await client.sendMessage(chatId, message);
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
        res.json(agents);
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
