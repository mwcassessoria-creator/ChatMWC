import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ChatWindow = ({ chat, messages, onSendMessage, currentUser, onClose }) => {
    const [inputText, setInputText] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCloseConversation = async () => {
        if (!currentUser) {
            alert('Usuário não autenticado');
            return;
        }

        const confirmed = window.confirm('Deseja encerrar este atendimento?');
        if (!confirmed) return;

        try {
            setIsClosing(true);
            // Get conversation ID from chat
            const { data: conversation } = await axios.get(`${API_URL}/api/chats`);
            const conv = conversation.find(c => c.id._serialized === chat.id._serialized);

            if (conv) {
                await axios.post(`${API_URL}/api/conversations/${conv.id}/close`, {
                    agentEmail: currentUser
                });
                alert('Atendimento encerrado com sucesso!');
                if (onClose) onClose();
            }
        } catch (error) {
            console.error('Error closing conversation:', error);
            alert('Erro ao encerrar atendimento. Tente novamente.');
        } finally {
            setIsClosing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                        {chat.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-gray-900">{chat.name}</h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>{chat.id.user}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCloseConversation}
                        disabled={isClosing}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <XCircle size={18} />
                        {isClosing ? 'Encerrando...' : 'Encerrar Atendimento'}
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                {messages.map((msg, index) => (
                    <Message
                        key={index}
                        isMe={msg.fromMe}
                        name={msg.fromMe ? "You" : chat.name}
                        time={new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        text={msg.body}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-200 bg-white">
                <div className="border border-gray-200 rounded-xl p-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
                    <textarea
                        placeholder="Type a message..."
                        className="w-full resize-none text-sm focus:outline-none mb-3"
                        rows={2}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    ></textarea>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-gray-400">
                            <button className="hover:text-gray-600"><Smile size={20} /></button>
                            <button className="hover:text-gray-600"><Paperclip size={20} /></button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">Press <b>Enter</b> to send</span>
                            <button
                                onClick={handleSend}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                                disabled={!inputText.trim()}
                            >
                                <span>Send</span>
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Message = ({ isMe, name, time, text }) => (
    <div className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isMe ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
            {name.charAt(0)}
        </div>
        <div className={`max-w-[60%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-900">{name}</span>
                <span className="text-xs text-gray-400">{time}</span>
            </div>
            <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                {text}
            </div>
        </div>
    </div>
);

export default ChatWindow;
