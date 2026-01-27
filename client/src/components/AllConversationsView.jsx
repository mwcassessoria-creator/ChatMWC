import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, SlidersHorizontal, MessageCircle, MessageSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function AllConversationsView({ onSelectConversation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAllConversations();
    }, []);

    const fetchAllConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/conversations`);
            // Ensure data is array
            setConversations(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching all conversations:', error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
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

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000); // Usually timestamp is unix seconds in typical WA objects, check if ms
        // If year is 1970, maybe it's ms? Let's heuristic.
        if (date.getFullYear() === 1970) {
            date.setTime(timestamp);
        }

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

    const filteredConversations = conversations.filter(chat =>
        (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chat.phone || '').includes(searchTerm)
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
            {/* Header Clean */}
            <div className="bg-white px-6 pt-6 pb-2 sticky top-0 z-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Todas</h2>

                <div className="flex gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar conversas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100/80 border-none rounded-xl text-gray-800 placeholder-gray-500 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                    <button className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                        <SlidersHorizontal size={22} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Conversation List Clean */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Carregando...
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center pt-20 opacity-60">
                        <MessageCircle size={64} className="text-gray-300 mb-4" strokeWidth={1} />
                        <p className="text-gray-400 font-medium">Nenhuma conversa encontrada</p>
                    </div>
                ) : (
                    filteredConversations.map((chat) => (
                        <div
                            key={chat.id._serialized || chat.id}
                            onClick={() => onSelectConversation(chat.id._serialized || chat.id, null)} // Pass chat ID. Ticket ID null?
                            className="bg-white px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4 group border-b border-gray-100 last:border-0"
                        >
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${getAvatarColor(chat.name || '?')}`}>
                                {(chat.name || '?').substring(0, 2).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className="font-bold text-gray-900 truncate text-[17px] leading-tight">
                                        {chat.name || 'Desconhecido'}
                                    </h3>
                                    <span className="text-[13px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                        {formatTime(chat.lastMessage?.timestamp || Date.now())}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[15px] text-gray-500 truncate leading-relaxed">
                                        {chat.lastMessage?.body || <span className="italic opacity-70">Nenhuma mensagem</span>}
                                    </p>
                                    {chat.unreadCount > 0 && (
                                        <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full ml-2">
                                            {chat.unreadCount}
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

export default AllConversationsView;
