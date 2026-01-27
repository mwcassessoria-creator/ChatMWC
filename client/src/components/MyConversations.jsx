import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
            {/* Header */}
            {/* Header */}
            <div className="bg-white border-b border-gray-100 pt-6 pb-2 px-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Minhas Conversas</h2>

                {/* Status Filters */}
                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { id: 'active', label: 'Em Andamento', count: activeCount, color: 'green' },
                        { id: 'queued', label: 'Pendente', count: pendingCount, color: 'yellow' },
                        { id: 'closed', label: 'Resolvidas', count: 0, color: 'gray' },
                        { id: 'all', label: 'Todas', count: conversations.length, color: 'blue' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setFilter(item.id)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 transform active:scale-95 duration-200 ${filter === item.id
                                    ? item.color === 'green' ? 'bg-green-500 text-white shadow-green-200 shadow-lg' :
                                        item.color === 'yellow' ? 'bg-yellow-500 text-white shadow-yellow-200 shadow-lg' :
                                            item.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' :
                                                'bg-gray-800 text-white shadow-gray-300 shadow-lg'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                }`}
                        >
                            {item.label}
                            {item.count > 0 && item.id !== 'all' && item.id !== 'closed' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === item.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Sort & Secondary Filters */}
                <div className="flex items-center gap-4 py-2 border-t border-gray-50">
                    <button
                        onClick={() => setSortBy('recent')}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${sortBy === 'recent'
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Mais Recentes
                    </button>
                    <button
                        onClick={() => setSortBy('priority')}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${sortBy === 'priority'
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Prioridade
                    </button>
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>Nenhuma conversa encontrada</p>
                    </div>
                ) : (
                    filteredConversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.conversations.chat_id, conv.conversation_id, conv.id, conv.conversations)}
                            className="bg-white border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {conv.conversations.name}
                                        </h3>
                                        {conv.conversations.unread_count > 0 && (
                                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {conv.conversations.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mb-1 text-xs text-mono text-gray-400">
                                        #{conv.id.slice(0, 8)}
                                        {conv.status === 'active' && (
                                            <span className="text-green-600 font-bold ml-1">• Ativo</span>
                                        )}
                                        {conv.status === 'closed' && (
                                            <span className="text-gray-500 font-medium ml-1">• Encerrado</span>
                                        )}
                                        {conv.status === 'transferred' && (
                                            <span className="text-blue-500 font-medium ml-1">• Transferido</span>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-600 mb-2 truncate">
                                        {conv.conversations.phone}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                            {conv.departments?.name || 'Sem departamento'}
                                        </span>
                                        {conv.conversations.priority && conv.conversations.priority !== 'normal' && (
                                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(conv.conversations.priority)}`}>
                                                {conv.conversations.priority}
                                            </span>
                                        )}
                                        {conv.conversations.tags && conv.conversations.tags.map((tag, idx) => (
                                            <span key={idx} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <span className="text-xs text-gray-500 block">
                                        {formatTime(conv.conversations.last_message_at)}
                                    </span>
                                    {conv.status === 'closed' && conv.closed_at && (
                                        <span className="text-[10px] text-gray-400 block mt-1">
                                            Fim: {new Date(conv.closed_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default MyConversations;
