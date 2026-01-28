import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Search, SlidersHorizontal, MessageCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function MyConversations({ currentUser, onSelectConversation, socket, onUpdateStats }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active (Em andamento), queued (Pendente), closed (Resolvido), all
    const [sortBy, setSortBy] = useState('recent'); // recent, priority

    useEffect(() => {
        if (currentUser) {
            fetchMyConversations();
        }
    }, [currentUser]);

    // Listen for real-time updates
    useEffect(() => {
        if (socket) {
            const handleMessage = (msg) => {
                // Refresh list on ANY message (simple approach)
                // In production, you might want to filter only if it affects me
                fetchMyConversations();
            };

            socket.on('message', handleMessage);
            return () => socket.off('message', handleMessage);
        }
    }, [socket, currentUser]);

    const fetchMyConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/conversations/my-conversations`, {
                params: { email: currentUser }
            });
            setConversations(response.data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update parent stats whenever conversations change
    useEffect(() => {
        if (!conversations) return;
        const queuedCount = conversations.filter(c => c.status === 'queued').length;
        if (onUpdateStats) {
            onUpdateStats({ queued: queuedCount });
        }
    }, [conversations, onUpdateStats]);

    const filteredConversations = conversations
        .filter(conv => {
            if (filter === 'all') return true;
            return conv.status === filter;
        })
        .sort((a, b) => {
            if (sortBy === 'recent') {
                return new Date(b.conversations.last_message_at) - new Date(a.conversations.last_message_at);
            }
            // Priority sort
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            return priorityOrder[a.conversations.priority || 'normal'] - priorityOrder[b.conversations.priority || 'normal'];
        });

    // Counts for UI
    const pendingCount = conversations.filter(c => c.status === 'queued').length;
    const activeCount = conversations.filter(c => c.status === 'active').length;

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'normal': return 'bg-blue-100 text-blue-800';
            case 'low': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    const getAvatarColor = (name = '?') => {
        const colors = [
            'bg-green-200 text-green-800',
            'bg-purple-200 text-purple-800',
            'bg-blue-200 text-blue-800',
            'bg-orange-200 text-orange-800',
            'bg-pink-200 text-pink-800',
            'bg-cyan-200 text-cyan-800'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading || !currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">
                    {!currentUser ? 'Inicializando...' : 'Carregando conversas...'}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full md:w-96 flex flex-col h-full bg-gray-50 border-r border-gray-200">{/* Changed from full width to fixed 384px */}
            {/* Header Clean */}
            <div className="bg-white px-6 pt-6 pb-2 sticky top-0 z-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Minhas Conversas</h2>

                <div className="flex gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar conversas..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100/80 border-none rounded-xl text-gray-800 placeholder-gray-500 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'active', label: 'Em Andamento', count: activeCount, color: 'green' },
                        { id: 'queued', label: 'Pendente', count: pendingCount, color: 'yellow' },
                        { id: 'closed', label: 'Resolvidas', count: 0, color: 'gray' },
                        { id: 'all', label: 'Todas', count: conversations.length, color: 'blue' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setFilter(item.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${filter === item.id
                                    ? item.color === 'green' ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200' :
                                        item.color === 'yellow' ? 'bg-yellow-500 border-yellow-500 text-white shadow-md shadow-yellow-200' :
                                            item.color === 'blue' ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' :
                                                'bg-gray-800 border-gray-800 text-white'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            {item.label}
                            {item.count > 0 && item.id !== 'closed' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === item.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversation List Clean */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center pt-20 opacity-60">
                        <MessageCircle size={64} className="text-gray-300 mb-4" strokeWidth={1} />
                        <p className="text-gray-400 font-medium">Nenhuma mensagem aqui</p>
                    </div>
                ) : (
                    filteredConversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.conversations.chat_id, conv.conversation_id, conv.id, conv.conversations)}
                            className="bg-white px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4 group border-b border-gray-100 last:border-0"
                        >
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${getAvatarColor(conv.conversations.name)}`}>
                                {conv.conversations.name?.substring(0, 2).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className="font-bold text-gray-900 truncate text-[17px] leading-tight">
                                        {conv.conversations.name}
                                    </h3>
                                    <span className="text-[13px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                        {formatTime(conv.conversations.last_message_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[15px] text-gray-500 truncate leading-relaxed">
                                        Nenhuma mensagem
                                    </p>
                                    {conv.conversations.unread_count > 0 && (
                                        <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full ml-2">
                                            {conv.conversations.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* FAB for new Chat (Optional) */}
            <div className="absolute bottom-6 left-0 w-full flex justify-center pointer-events-none">
                <button className="w-14 h-14 bg-white border border-blue-100 rounded-full shadow-lg shadow-blue-100 text-blue-500 flex items-center justify-center pointer-events-auto hover:scale-105 transition-transform active:scale-95">
                    <MessageSquare size={26} strokeWidth={2.5} fill="#3b82f6" className="text-white" />
                </button>
            </div>
        </div>
    );
}

export default MyConversations;
