import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import SetPassword from './components/SetPassword';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import AgentRegistration from './components/AgentRegistration';
import AgentsView from './components/AgentsView';
import io from 'socket.io-client';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const socket = io(SOCKET_URL);

function App() {
    const [chats, setChats] = useState([]);
    const [conversations, setConversations] = useState([]); // Filtered chats
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [qrCode, setQrCode] = useState('');
    const [status, setStatus] = useState('disconnected');
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showSetPassword, setShowSetPassword] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [currentView, setCurrentView] = useState('conversations'); // 'conversations' or 'agents'
    const activeChatRef = useRef(null);

    // Check authentication on mount
    useEffect(() => {
        const auth = localStorage.getItem('isAuthenticated');
        const email = localStorage.getItem('userEmail');
        if (auth === 'true' && email) {
            setIsAuthenticated(true);
            setCurrentUser(email);
        }
    }, []);

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

    // Listen for agent registration modal trigger
    useEffect(() => {
        const handleOpenModal = () => setShowAgentModal(true);
        window.addEventListener('openAgentRegistration', handleOpenModal);
        return () => window.removeEventListener('openAgentRegistration', handleOpenModal);
    }, []);

    // Fetch chats on chat select (actually just set active and get messages)
    useEffect(() => {
        if (activeChat) {
            fetchMessages(activeChat.id._serialized);
        }
    }, [activeChat]);

    const fetchChats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/chats`);
            setChats(response.data);
            // default filter
            setConversations(response.data);
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    const fetchMessages = async (chatId) => {
        try {
            const response = await axios.get(`${API_URL}/api/messages/${chatId}`);
            setMessages(response.data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const handleSendMessage = async (text) => {
        if (!activeChat) return;
        try {
            await axios.post(`${API_URL}/api/send`, {
                chatId: activeChat.id._serialized,
                message: text
            });
            // Optimistic update or wait for socket event
        } catch (error) {
            console.error("Failed to send:", error);
        }
    };

    const handleLogin = (email) => {
        setIsAuthenticated(true);
        setCurrentUser(email);
    };

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userEmail');
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    const handleFirstLogin = (email) => {
        setPendingUser(email);
        setShowSetPassword(true);
    };

    const handlePasswordSet = () => {
        setShowSetPassword(false);
        setIsAuthenticated(true);
        setCurrentUser(pendingUser);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', pendingUser);
    };

    // Show set password screen for first-time users
    if (showSetPassword && pendingUser) {
        return <SetPassword email={pendingUser} onPasswordSet={handlePasswordSet} />;
    }

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} onFirstLogin={handleFirstLogin} />;
    }

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <Sidebar
                status={status}
                onLogout={handleLogout}
                onNavigate={setCurrentView}
            />

            {currentView === 'agents' ? (
                <AgentsView />
            ) : (
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
            )}

            {showAgentModal && (
                <AgentRegistration
                    onClose={() => setShowAgentModal(false)}
                    onSuccess={() => {
                        setShowAgentModal(false);
                        // Optionally refresh agents list
                    }}
                />
            )}
        </div>
    );
}

export default App;
