import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, XCircle, Edit2, Save, Building, ArrowRightLeft, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import TransferModal from './TransferModal';
import ClientEditModal from './ClientEditModal';
import CloseTicketModal from './CloseTicketModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ChatWindow = ({ chat, messages, onSendMessage, currentUser, onAssignToMe, onCloseTicket, onTransferTicket, onClose, onChatUpdated }) => {
    const [inputText, setInputText] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    // Removed inline edit states
    const [hasActiveTicket, setHasActiveTicket] = useState(true);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
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

    // Client Edit Modal - State moved to top


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

    const handleCloseConversation = () => {
        if (!currentUser) {
            alert('Usuário não autenticado');
            return;
        }
        if (!chat.conversationId) {
            alert('Esta conversa não está atribuída a você.');
            return;
        }
        setShowCloseModal(true);
    };

    const handleConfirmClose = async (subject) => {
        try {
            setIsClosing(true);
            await onCloseTicket(chat.conversationId, subject);
            setIsClosing(false);
            setShowCloseModal(false);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', chat.id._serialized);
        formData.append('agentEmail', currentUser);

        try {
            await axios.post(`${API_URL}/api/send`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Error sending file:', error);
            alert('Falha ao enviar arquivo.');
        } finally {
            setIsUploading(false);
        }
    };

    // handleSaveDetails removed (replaced by ClientEditModal)

    // Message Component
    const Message = ({ isMe, name, time, text, hasMedia, mediaUrl, mediaType }) => (
        <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
            {/* Avatar - Bottom Aligned */}
            <div className="flex flex-col justify-end">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isMe ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {name.charAt(0)}
                </div>
            </div>

            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div className={`px-4 py-3 text-sm shadow-sm relative break-words ${isMe
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-sm'
                    }`}>
                    {hasMedia && mediaUrl ? (
                        <div className="space-y-2">
                            {mediaType?.includes('image') ? (
                                <img src={`${API_URL}${mediaUrl}`} alt="Anexo" className="max-w-full rounded-lg" />
                            ) : (
                                <a
                                    href={`${API_URL}${mediaUrl}`}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isMe ? 'bg-blue-700/50 hover:bg-blue-700' : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                                        <Paperclip size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate text-xs opacity-90">{text || 'Documento'}</span>
                                        <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-blue-500'}`}>Baixar Arquivo</span>
                                    </div>
                                </a>
                            )}
                            {text && mediaType?.includes('image') && <div className="mt-2">{text}</div>}
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                    )}
                </div>

                {/* Meta Info - Below Bubble */}
                <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-400 font-medium">{name}</span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400">{time}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Header */}
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm z-10 sticky top-0 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    {/* Back Button (Mobile Only) */}
                    <button onClick={onClose} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                        <ArrowLeft size={22} />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center font-bold text-blue-600 text-lg shadow-sm border border-blue-50">
                        {chat.name?.charAt(0) || '?'}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h2 className="font-bold text-gray-900 truncate leading-tight text-[15px]">{chat.name}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]"></div>
                            <span className="text-[11px] text-green-600 font-medium">Online</span>
                            {chat.company && (
                                <>
                                    <span className="text-gray-300 text-[10px]">•</span>
                                    <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{chat.company}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 pl-2">
                    <button onClick={() => setShowEditModal(true)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-all">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={() => setShowTransferModal(true)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-all">
                        <ArrowRightLeft size={18} />
                    </button>
                    {hasActiveTicket ? (
                        <button
                            onClick={handleCloseConversation}
                            disabled={isClosing}
                            className="bg-red-50 hover:bg-red-100 text-red-600 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold transition-all ml-1"
                        >
                            <XCircle size={14} />
                            <span className="hidden sm:inline">Encerrar</span>
                            <span className="sm:hidden">Fim</span>
                        </button>
                    ) : (
                        <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-1 rounded-full font-bold border border-gray-200 ml-1">FECHADO</span>
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
                        hasMedia={msg.hasMedia}
                        mediaUrl={msg.mediaUrl}
                        mediaType={msg.type}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-3 md:p-4 border-t border-gray-100 relative shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                {showEmojiPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                        <div className="absolute bottom-20 left-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setInputText(prev => prev + emojiData.emoji);
                                    setShowEmojiPicker(false);
                                }}
                                width={300}
                                height={400}
                            />
                        </div>
                    </>
                )}

                {assignedToOther ? (
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                        <span className="font-medium flex items-center gap-2 text-sm"><span className="text-lg">🔒</span> Em atendimento por outro agente</span>
                    </div>
                ) : isUnassigned ? (
                    <div className="flex items-center justify-center py-2">
                        <button
                            onClick={handleAssign}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 w-full md:w-auto justifying-center"
                        >
                            <ArrowRightLeft size={20} />
                            <span>Iniciar Atendimento</span>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="flex gap-2 items-end">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2.5 rounded-full hover:bg-blue-50 transition-colors ${showEmojiPicker ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                        >
                            <Smile size={24} />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-gray-400 hover:text-blue-500 p-2.5 rounded-full hover:bg-blue-50 transition-colors"
                            disabled={isUploading}
                        >
                            <Paperclip size={24} className={isUploading ? "animate-pulse text-blue-500" : ""} />
                        </button>

                        <div className="flex-1 bg-gray-100 rounded-[24px] flex items-center px-4 py-2 min-h-[44px] transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white border border-transparent focus-within:border-blue-200">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Digite uma mensagem..."
                                className="w-full bg-transparent border-none focus:ring-0 text-[15px] text-gray-800 placeholder-gray-400 leading-relaxed"
                                disabled={isUploading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!inputText.trim() || (!hasActiveTicket && !isUnassigned)}
                            className={`p-3 rounded-full shadow-md flex items-center justify-center transition-all transform active:scale-95 duration-200 ${inputText.trim() && (hasActiveTicket || isUnassigned)
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-lg'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            <Send size={20} className={inputText.trim() ? "ml-0.5" : ""} />
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
                client={{
                    id: chat.conversationId, // Fix: Pass the UUID so PUT /api/clients/:id works
                    name: chat.name,
                    company: chat.company,
                    phone: chat.phone || (chat.id && chat.id._serialized ? chat.id._serialized.split('@')[0] : (typeof chat.id === 'string' ? chat.id.split('@')[0] : ''))
                }}
                onSuccess={() => {
                    if (onChatUpdated) onChatUpdated();
                }}
            />

            <CloseTicketModal
                isOpen={showCloseModal}
                onClose={() => setShowCloseModal(false)}
                onConfirm={handleConfirmClose}
                isLoading={isClosing}
            />
        </div>
    );
};


export default ChatWindow;
