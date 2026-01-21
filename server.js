const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// =====================================
// WHATSAPP CLIENT
// =====================================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
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

// Message Handling
client.on("message_create", async (msg) => {
    // Emit new message to frontend
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

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
