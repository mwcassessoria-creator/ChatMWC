import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Login from './components/Login';
import SetPassword from './components/SetPassword';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import AgentRegistration from './components/AgentRegistration';
import AgentsView from './components/AgentsView';
import MyConversations from './components/MyConversations';
import DepartmentView from './components/DepartmentView';
import io from 'socket.io-client';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Bypass Ngrok warning page for free-tier users
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

function App() {
    const [socket, setSocket] = useState(null);
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
    const [currentView, setCurrentView] = useState('conversations'); // 'conversations', 'my-conversations', 'departments', 'all-conversations', 'agents'
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

    // Initialize socket only when authenticated
    useEffect(() => {
        if (isAuthenticated && !socket) {
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Socket connected');
            });

            newSocket.on('qr', (qr) => {
                setQrCode(qr);
                setStatus('qr_needed');
            });

            newSocket.on('ready', () => {
                setStatus('connected');
                fetchChats();
            });

            // Real-time message listener
            newSocket.on('message', (msg) => {
                if (activeChatRef.current && (msg.from === activeChatRef.current.id._serialized || msg.to === activeChatRef.current.id._serialized)) {
                    setMessages(prev => [...prev, msg]);
                }
                fetchChats();
            });

            return () => {
                newSocket.off('connect');
                newSocket.off('qr');
                newSocket.off('ready');
                newSocket.off('message');
                newSocket.disconnect();
            };
        }
    }, [isAuthenticated]);

    // Fetch chats on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetchChats();
        }
    }, [isAuthenticated]);

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
                currentView={currentView}
            />

            {currentView === 'agents' ? (
                <AgentsView />
            ) : currentView === 'my-conversations' ? (
                <div className="flex flex-1 overflow-hidden">
                    <MyConversations
                        currentUser={currentUser}
                        onSelectConversation={(chatId, conversationId) => {
                            const chat = chats.find(c => c.id._serialized === chatId);
                            if (chat) {
                                chat.conversationId = conversationId; // Store conversation ID
                                setActiveChat(chat);
                            }
                        }}
                    />
                    {activeChat ? (
                        <ChatWindow
                            chat={activeChat}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            currentUser={currentUser}
                            onClose={() => {
                                setActiveChat(null);
                                // Refresh conversations list
                                fetchChats();
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
                            <p>Selecione uma conversa para iniciar o atendimento</p>
                        </div>
                    )}
                </div>
            ) : currentView === 'departments' ? (
                <DepartmentView currentUser={currentUser} />
            ) : currentView === 'all-conversations' ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                        <p className="text-xl mb-2">🚧 Em Desenvolvimento</p>
                        <p>Visão de todas as conversas (Admin)</p>
                    </div>
                </div>
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
                                        <QRCodeSVG value={qrCode} size={256} />
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
