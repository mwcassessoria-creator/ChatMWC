import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

const ChatList = ({ chats, activeChat, onChatSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const bgColors = ['bg-blue-100', 'bg-purple-100', 'bg-green-100', 'bg-yellow-100', 'bg-pink-100', 'bg-indigo-100'];
    const textColors = ['text-blue-600', 'text-purple-600', 'text-green-600', 'text-yellow-600', 'text-pink-600', 'text-indigo-600'];

    const getAvatarColor = (name) => {
        const index = name.length % bgColors.length;
        return { bg: bgColors[index], text: textColors[index] };
    };

    return (
        <div className="w-96 bg-white border-r border-gray-100 flex flex-col h-screen font-sans">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                    <button className="text-gray-400 hover:text-gray-600">
                        <Filter size={20} />
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder-gray-400 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
                {filteredChats.map(chat => {
                    const colors = getAvatarColor(chat.name || chat.id.user);
                    return (
                        <ChatItem
                            key={chat.id._serialized}
                            name={chat.name || chat.id.user}
                            msg={chat.lastMessage ? chat.lastMessage.body : ''}
                            time={chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            active={activeChat && activeChat.id._serialized === chat.id._serialized}
                            onClick={() => onChatSelect(chat)}
                            unreadCount={chat.unreadCount}
                            colors={colors}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const ChatItem = ({ name, msg, time, active, onClick, unreadCount, colors }) => (
    <div
        onClick={onClick}
        className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-l-4 ${active
                ? 'bg-blue-50 border-blue-500 shadow-sm'
                : 'bg-white border-transparent hover:bg-gray-50'
            }`}
    >
        <div className="flex gap-4">
            <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${colors.bg} ${colors.text}`}>
                {name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold text-sm truncate ${active ? 'text-blue-900' : 'text-gray-900'}`}>{name}</h3>
                    <span className="text-xs text-gray-400 font-medium">{time}</span>
                </div>
                <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${active ? 'text-blue-700/80 font-medium' : 'text-gray-500'}`}>
                        {msg || <span className="italic opacity-50">No messages</span>}
                    </p>
                    {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1 shadow-sm shadow-blue-200">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </div>
);

export default ChatList;
