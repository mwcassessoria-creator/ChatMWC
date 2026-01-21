import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:3000');

function App() {
    const [chats, setChats] = useState([]);
    const [conversations, setConversations] = useState([]); // Filtered chats
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [qrCode, setQrCode] = useState('');
    const [status, setStatus] = useState('disconnected'); // connected, disconnected
    const activeChatRef = useRef(null);

    // Sync ref with state
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    // Initial Data Fetch & Socket Listeners
    useEffect(() => {
        fetchChats();

        socket.on('connect', () => {
            console.log('Socket connected');
        });

        socket.on('qr', (qr) => {
            setQrCode(qr);
            setStatus('qr_needed');
        });

        socket.on('ready', () => {
            setStatus('connected');
            fetchChats();
        });

        // Real-time message listener
        socket.on('message', (msg) => {
            // If message belongs to active chat, add to messages
            if (activeChatRef.current && (msg.from === activeChatRef.current.id._serialized || msg.to === activeChatRef.current.id._serialized)) {
                setMessages(prev => [...prev, msg]);
            }
            // Always refresh chats to update last message/time
            fetchChats();
        });

        return () => {
            socket.off('connect');
            socket.off('qr');
            socket.off('ready');
            socket.off('message');
        };
    }, []);

    // Fetch chats on chat select (actually just set active and get messages)
    useEffect(() => {
        if (activeChat) {
            fetchMessages(activeChat.id._serialized);
        }
    }, [activeChat]);

    const fetchChats = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/chats');
            setChats(response.data);
            // default filter
            setConversations(response.data);
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    const fetchMessages = async (chatId) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/messages/${chatId}`);
            setMessages(response.data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const handleSendMessage = async (text) => {
        if (!activeChat) return;
        try {
            await axios.post('http://localhost:3000/api/send', {
                chatId: activeChat.id._serialized,
                message: text
            });
            // Optimistic update or wait for socket event
        } catch (error) {
            console.error("Failed to send:", error);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <Sidebar status={status} />
            <div className="flex flex-1 overflow-hidden">
                <ChatList
                    chats={conversations}
                    activeChat={activeChat}
                    onChatSelect={setActiveChat}
                />
                {activeChat ? (
                    <ChatWindow
                        chat={activeChat}
                        messages={messages}
                        onSendMessage={handleSendMessage}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
                        {status === 'qr_needed' && qrCode ? (
                            <div className="text-center">
                                <p className="mb-4">Scan the QR Code to connect</p>
                                {/* You would need a QR code component here, or just display raw text for now */}
                                <div className="bg-white p-4 inline-block rounded shadow">
                                    QR Code Ready (Check Terminal)
                                </div>
                            </div>
                        ) : (
                            <p>Select a conversation to start chatting</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
