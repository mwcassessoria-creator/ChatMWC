import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare } from 'lucide-react';
import Login from './components/Login';
import SetPassword from './components/SetPassword';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import AgentRegistration from './components/AgentRegistration';
import AgentsView from './components/AgentsView';
import MyConversations from './components/MyConversations';
import DepartmentView from './components/DepartmentView';
import ClientsView from './components/ClientsView';
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
    const [currentView, setCurrentView] = useState('my-conversations'); // 'conversations', 'my-conversations', 'departments', 'all-conversations', 'agents'
    const [stats, setStats] = useState({ queued: 0 }); // Notifications
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
            const newSocket = io(SOCKET_URL, {
                extraHeaders: {
                    "ngrok-skip-browser-warning": "true"
                }
            });
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
                    // Check for Ticket Change (New session started purely by backend)
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && msg.ticketId && lastMsg.ticket_id && msg.ticketId !== lastMsg.ticket_id) {
                            return [msg];
                        }
                        return [...prev, msg];
                    });
                } else {
                    // Background notification
                    if (!msg.fromMe) {
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.play().catch(e => console.log('Audio play failed:', e));
                        } catch (err) { }

                        // Show Toast (if not me)
                        setNotification(msg.body);
                        setTimeout(() => setNotification(null), 5000);
                    }
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
            // checkActiveTicket(activeChat.id._serialized); // Assuming this function exists or is intended to be added
            // Pass the specific ticket ID if selected (for viewing history)
            fetchMessages(activeChat.id._serialized, activeChat.selectedTicketId);
        } else {
            setMessages([]);
        }
    }, [activeChat]);

    const autoAssignToMe = async (conversationId) => {
        try {
            await axios.post(`${API_URL}/api/conversations/${conversationId}/assign-to-me`, {
                agentEmail: currentUser
            });

            // 1. Fetch fresh list of chats from backend
            const updatedChats = await fetchChats();

            // 2. Find the updated conversation in the fresh list
            if (updatedChats && updatedChats.length > 0) {
                const updatedChat = updatedChats.find(c => c.conversationId === conversationId);

                // 3. Update activeChat with the FULL object (which now has valid agent_id)
                if (updatedChat) {
                    setActiveChat(updatedChat);
                    // 4. Force specific message refresh just in case
                    if (updatedChat.id && updatedChat.id._serialized) {
                        fetchMessages(updatedChat.id._serialized);
                    }
                }
            }
        } catch (error) {
            console.error('Auto-assign error:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.error || error.message;
            const errorDetails = error.response?.data?.details || '';
            alert(`Erro ao assumir atendimento: ${errorMessage}\n${errorDetails}`);
        }
    };

    const fetchChats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/chats`);
            setChats(response.data);
            // default filter
            setConversations(response.data);
            return response.data; // Return data for chaining
        } catch (error) {
            console.error("Error fetching chats:", error);
            return [];
        }
    };

    const fetchMessages = async (chatId, ticketId = null) => {
        try {
            const params = ticketId ? { ticketId } : {};
            const response = await axios.get(`${API_URL}/api/messages/${chatId}`, { params });
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
                message: text,
                agentEmail: currentUser // Send agent email to identify sender
            });
            // Optimistic update or wait for socket event
        } catch (error) {
            console.error("Failed to send:", error);
        }
    };

    const handleCloseTicket = async (conversationId, subject) => {
        try {
            await axios.post(`${API_URL}/api/conversations/${conversationId}/close`, {
                agentEmail: currentUser,
                subject: subject
            });
            // Refresh
            fetchChats();
        } catch (error) {
            console.error("Failed to close ticket:", error);
            throw error; // Re-throw to be caught by UI
        }
    };

    const handleTransferTicket = async (conversationId, targetAgentId) => {
        try {
            await axios.post(`${API_URL}/api/conversations/${conversationId}/transfer`, {
                targetAgentId,
                agentEmail: currentUser
            });
            fetchChats();
        } catch (error) {
            console.error("Failed to transfer ticket:", error);
            const errorMessage = error.response?.data?.error || error.message;
            const errorDetails = error.response?.data?.details || '';
            alert(`Erro ao transferir atendimento: ${errorMessage}\n${errorDetails}`);
            throw error;
        }
    };

    const handleLogin = (email) => {
        // Persist immediately to avoid race conditions/white screen
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', email);
        setCurrentUser(email);
        setIsAuthenticated(true);
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
                currentUser={currentUser}
                stats={stats}
            />

            {currentView === 'agents' ? (
                <AgentsView />
            ) : currentView === 'clients' ? (
                <ClientsView
                    onStartChat={async (chatId, clientId) => {
                        // Switch view and open chat
                        setCurrentView('my-conversations');

                        // Construct chat object
                        let chat = chats.find(c => c.id._serialized === chatId);
                        let realConversationId = null;

                        if (chat) {
                            realConversationId = chat.id; // Usually valid UUID if from DB
                            // If chat.id is object (WA), verify if we have conversationId prop
                            if (typeof chat.id === 'object') realConversationId = chat.conversationId;
                        } else {
                            // Fallback if not in current list (rare if refreshed)
                            // TRY TO LOOKUP REAL UUID from Server 
                            try {
                                const { data: conv } = await axios.get(`${API_URL}/api/conversations/lookup/${chatId}`);
                                if (conv && conv.id) {
                                    realConversationId = conv.id;
                                    chat = {
                                        id: { _serialized: chatId },
                                        ...conv
                                    };
                                }
                            } catch (err) {
                                console.warn("Lookup failed, using fallback (assignments might fail):", err);
                            }

                            if (!chat) {
                                chat = {
                                    id: { _serialized: chatId },
                                    name: 'Carregando...',
                                    unreadCount: 0
                                };
                            }
                        }

                        setActiveChat({
                            ...chat,
                            conversationId: realConversationId // Use resolved UUID or null
                        });

                        if (!realConversationId) fetchChats();
                    }}
                />
            ) : currentView === 'my-conversations' ? (
                <div className="flex flex-1 overflow-hidden">
                    <MyConversations
                        currentUser={currentUser}
                        socket={socket} // Pass socket for realtime updates
                        onSelectConversation={(chatId, conversationId, ticketId, conversationData) => {
                            let chat = chats.find(c => c.id._serialized === chatId);

                            // Fallback if chat not in main list but we have data
                            if (!chat && conversationData) {
                                chat = {
                                    id: { _serialized: chatId },
                                    name: conversationData.name,
                                    isGroup: false,
                                    unreadCount: 0
                                };
                            }

                            if (chat) {
                                // Clone to ensure React detects state change
                                const newActiveChat = {
                                    ...chat,
                                    conversationId: conversationId,
                                    selectedTicketId: ticketId
                                };
                                setActiveChat(newActiveChat);
                            } else {
                                console.warn('Chat not found for ID:', chatId);
                            }
                        }}
                    />
                    {activeChat ? (
                        <ChatWindow
                            chat={activeChat}
                            currentUser={currentUser}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            onCloseTicket={handleCloseTicket}
                            onTransferTicket={handleTransferTicket}
                            onAssignToMe={(convId) => autoAssignToMe(convId)}
                            onChatUpdated={() => fetchChats()}
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
                            currentUser={currentUser}
                            onClose={() => setActiveChat(null)}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-8 text-center">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                                <MessageSquare size={40} className="text-blue-500" />
                                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-sm">
                                    <MessageSquare size={16} className="text-blue-500" />
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-2">Select a conversation</h2>
                            <p className="text-sm text-gray-500 max-w-sm mb-8">
                                Choose a conversation from the left to start chatting with your customers. You can search by name or contact details.
                            </p>

                            <div className="flex gap-3">
                                <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:border-gray-300">Active Chats</span>
                                <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:border-gray-300">Support Queue</span>
                                <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:border-gray-300">History</span>
                            </div>
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
