import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, XCircle, Edit2, Save, Building, ArrowRightLeft } from 'lucide-react';
import axios from 'axios';
import TransferModal from './TransferModal';
import ClientEditModal from './ClientEditModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ChatWindow = ({ chat, messages, onSendMessage, currentUser, onAssignToMe, onCloseTicket, onTransferTicket, onClose, onChatUpdated }) => {
    const [inputText, setInputText] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    // Removed inline edit states
    const [hasActiveTicket, setHasActiveTicket] = useState(true);
    const messagesEndRef = useRef(null);
    const [initialShowTransferModal, setInitialShowTransferModal] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Check assignment status
    const isAssignedToMe = chat?.agent_id && currentUser && chat.agent_email === currentUser;
    const isUnassigned = !chat?.agent_id;
    const assignedToOther = chat?.agent_id && (!currentUser || chat.agent_email !== currentUser);

    const handleAssign = () => {
        if (onAssignToMe && chat?.conversationId) {
            onAssignToMe(chat.conversationId);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (chat) {
            checkActiveTicket();
        }
    }, [chat, messages]);

    // Client Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);

    const checkActiveTicket = async () => {
        const hasTicketMessages = messages && messages.length > 0 && messages.some(m => m.ticketId);

        if (hasTicketMessages) {
            setHasActiveTicket(true);
        } else {
            if (!chat.conversationId) {
                setHasActiveTicket(false);
                return;
            }
            try {
                const hasMessages = messages.length > 0 && messages.some(m => m.ticketId);
                setHasActiveTicket(hasMessages);
            } catch (error) {
                console.error('Error checking active ticket:', error);
                setHasActiveTicket(true);
            }
        }
    };

    const handleSend = (e) => {
        e?.preventDefault();
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
        if (!chat.conversationId) {
            alert('Esta conversa não está atribuída a você.');
            return;
        }
        const confirmed = window.confirm('Deseja encerrar este atendimento?');
        if (!confirmed) return;

        try {
            setIsClosing(true);
            await onCloseTicket(chat.conversationId);
            setIsClosing(false);
            if (onClose) onClose();
        } catch (error) {
            alert('Falha ao encerrar ticket. Veja o console.');
            setIsClosing(false);
        }
    };

    const handleTransfer = async (targetAgentId) => {
        if (!currentUser || !chat.conversationId) return;
        try {
            await axios.post(`${API_URL}/api/conversations/${chat.conversationId}/transfer`, {
                targetAgentId,
                agentEmail: currentUser
            });
            alert('Atendimento transferido com sucesso!');
            setShowTransferModal(false);
            if (onClose) onClose();
        } catch (error) {
            console.error('Error transferring:', error);
            alert('Erro ao transferir atendimento.');
        }
    };

    // handleSaveDetails removed (replaced by ClientEditModal)

    // Message Component
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

    return (
        <div className="flex-1 flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xl">
                        {chat.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                        <div>
                            <h2 className="font-bold text-lg">{chat.name}</h2>
                            {chat.company && <span className="bg-gray-100 text-xs px-2 py-0.5 rounded">{chat.company}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowEditModal(true)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={() => setShowTransferModal(true)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg flex items-center gap-2">
                        <ArrowRightLeft size={18} /> Transferir
                    </button>
                    {hasActiveTicket ? (
                        <button onClick={handleCloseConversation} disabled={isClosing} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2">
                            <XCircle size={18} /> {isClosing ? 'Encerrando...' : 'Encerrar'}
                        </button>
                    ) : (
                        <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg flex items-center gap-2"><XCircle size={18} /> Encerrado</span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                {messages.map((msg, index) => (
                    <Message
                        key={index}
                        isMe={msg.fromMe}
                        name={msg.fromMe ? "Você" : chat.name}
                        time={new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        text={msg.body}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-gray-200">
                {assignedToOther ? (
                    <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg border border-gray-200 text-gray-500">
                        <span className="font-medium mr-2">🔒 Conversa em atendimento por outro agente</span>
                    </div>
                ) : isUnassigned ? (
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handleAssign}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            <ArrowRightLeft size={20} />
                            Fazer Atendimento
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="flex gap-2 items-center">
                        <button type="button" className="text-gray-500 hover:text-gray-600"><Smile size={24} /></button>
                        <button type="button" className="text-gray-500 hover:text-gray-600"><Paperclip size={24} /></button>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite uma mensagem..."
                            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
                            disabled={!hasActiveTicket && !isUnassigned}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || !hasActiveTicket}
                            className={`p-2 rounded-full ${inputText.trim() && hasActiveTicket ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                )}
            </div>

            {showTransferModal && (
                <TransferModal
                    isOpen={showTransferModal}
                    onClose={() => setShowTransferModal(false)}
                    onTransfer={handleTransfer}
                    currentAgentEmail={currentUser}
                />
            )}

            <ClientEditModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                client={chat} // Pass the chat object as client (it has name, id, company)
                onSuccess={() => {
                    if (onChatUpdated) onChatUpdated(); // Update Side/List
                }}
            />
        </div>
    );
};


export default ChatWindow;
