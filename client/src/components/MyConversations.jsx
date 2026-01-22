import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function MyConversations({ currentUser, onSelectConversation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active (Em andamento), queued (Pendente), closed (Resolvido), all
    const [sortBy, setSortBy] = useState('recent'); // recent, priority

    useEffect(() => {
        if (currentUser) {
            fetchMyConversations();
        }
    }, [currentUser]);

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
        <div className="w-96 flex flex-col h-full bg-gray-50 border-r border-gray-200">{/* Changed from full width to fixed 384px */}
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Minhas Conversas</h2>

                {/* Filters */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Em Andamento
                    </button>
                    <button
                        onClick={() => setFilter('queued')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'queued'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Pendente
                    </button>
                    <button
                        onClick={() => setFilter('closed')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'closed'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Resolvidas
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Todas ({conversations.length})
                    </button>
                </div>

                {/* Sort */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setSortBy('recent')}
                        className={`px-3 py-1 rounded text-sm ${sortBy === 'recent'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Mais Recentes
                    </button>
                    <button
                        onClick={() => setSortBy('priority')}
                        className={`px-3 py-1 rounded text-sm ${sortBy === 'priority'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
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
                            onClick={() => onSelectConversation(conv.conversations.chat_id, conv.conversation_id)}
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
                                    <p className="text-sm text-gray-600 mb-2">
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
                                    <span className="text-xs text-gray-500">
                                        {formatTime(conv.conversations.last_message_at)}
                                    </span>
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
