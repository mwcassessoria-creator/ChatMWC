import React, { useState } from 'react';
import { Search } from 'lucide-react';

const ChatList = ({ chats, activeChat, onChatSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-screen">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filteredChats.map(chat => (
                    <ChatItem
                        key={chat.id._serialized}
                        name={chat.name || chat.id.user}
                        msg={chat.lastMessage ? chat.lastMessage.body : ''}
                        time={chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        active={activeChat && activeChat.id._serialized === chat.id._serialized}
                        onClick={() => onChatSelect(chat)}
                        unreadCount={chat.unreadCount}
                    />
                ))}
            </div>
        </div>
    );
};

const ChatItem = ({ name, msg, time, active, onClick, unreadCount }) => (
    <div onClick={onClick} className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${active ? 'bg-blue-50/50' : ''}`}>
        <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-500">
                {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                    </div>
                    <span className="text-xs text-blue-500 font-medium">{time}</span>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 truncate">{msg}</p>
                    {unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                </div>
            </div>
        </div>
    </div>
);

export default ChatList;
