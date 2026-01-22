import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, XCircle, Edit2, Save, Building, ArrowRightLeft } from 'lucide-react';
import axios from 'axios';
import TransferModal from './TransferModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ChatWindow = ({ chat, messages, onSendMessage, currentUser, onClose }) => {
    const [inputText, setInputText] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedCompany, setEditedCompany] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (chat) {
            setEditedName(chat.name || '');
            setEditedCompany(chat.company || ''); // Ensure chat object has company if available
            setIsEditingDetails(false);
        }
    }, [chat]);

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

        if (!chat.conversationId) {
            alert('Esta conversa não está atribuída a você.');
            return;
        }

        const confirmed = window.confirm('Deseja encerrar este atendimento?');
        if (!confirmed) return;

        try {
            setIsClosing(true);
            await axios.post(`${API_URL}/api/conversations/${chat.conversationId}/close`, {
                agentEmail: currentUser
            });
            alert('Atendimento encerrado com sucesso!');
            if (onClose) onClose();
        } catch (error) {
            console.error('Error closing conversation:', error);
            alert('Erro ao encerrar atendimento. Tente novamente.');
        } finally {
            setIsClosing(false);
        }
    };

    const handleTransfer = async (targetAgentId) => {
        if (!currentUser) {
            alert("Erro: Usuário não autenticado.");
            return;
        }
        if (!chat.conversationId) {
            alert("Erro: ID da conversa não encontrado. Tente recarregar a página.");
            console.error("Missing conversationId for chat:", chat);
            return;
        }

        try {
            await axios.post(`${API_URL}/api/conversations/${chat.conversationId}/transfer`, {
                targetAgentId,
                agentEmail: currentUser
            });
            alert('Atendimento transferido com sucesso!');
            setShowTransferModal(false);
            if (onClose) onClose();
        } catch (error) {
            console.error('Error transferring conversation:', error);
            alert('Erro ao transferir atendimento.');
        }
    };

    const handleSaveDetails = async () => {
        if (!chat.conversationId) return;

        try {
            await axios.put(`${API_URL}/api/conversations/${chat.conversationId}/details`, {
                name: editedName,
                company: editedCompany
            });

            // Update local chat object reference if possible, or trigger refresh
            chat.name = editedName;
            chat.company = editedCompany;

            setIsEditingDetails(false);
            alert('Dados atualizados!');
        } catch (error) {
            console.error('Error updating details:', error);
            alert('Erro ao atualizar dados. Verifique se a coluna "company" existe no banco de dados.');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xl">
                        {chat.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        {isEditingDetails ? (
                            <div className="absolute top-16 left-4 z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 w-80 flex flex-col gap-3 animate-in fade-in zoom-in duration-200">
                                <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-1">Editar Dados do Cliente</h3>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Nome do Cliente"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={chat.id.user.split('@')[0]}
                                        disabled
                                        className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Empresa</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            value={editedCompany}
                                            onChange={(e) => setEditedCompany(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="Nome da Empresa"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => setIsEditingDetails(false)}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveDetails}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} />
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-gray-900 text-lg">{chat.name}</h2>
                                    {chat.company && (
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Building size={10} />
                                            {chat.company}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                    <span>{chat.id.user}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsEditingDetails(true)}
                        className={`p-2 rounded-full transition-colors ${isEditingDetails ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title="Editar Dados"
                    >
                        <Edit2 size={18} />
                    </button>
                    {isEditingDetails ? <Save size={18} /> : <Edit2 size={18} />}
                </button>
                {isEditingDetails && (
                    <button
                        onClick={() => setIsEditingDetails(false)}
                        className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Cancelar"
                    >
                        <XCircle size={18} />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <ArrowRightLeft size={18} />
                    Transferir
                </button>

                <button
                    onClick={handleCloseConversation}
                    disabled={isClosing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <XCircle size={18} />
                    {isClosing ? 'Encerrando...' : 'Encerrar'}
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600"><MoreVertical size={20} /></button>
            </div>
        </div>

            {/* Messages */ }
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

    {/* Input Area */ }
    <div className="p-6 border-t border-gray-200 bg-white">
        <div className="border border-gray-200 rounded-xl p-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
            <textarea
                placeholder="Digite uma mensagem..."
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
                    <span className="text-xs text-gray-400">Pressione <b>Enter</b> para enviar</span>
                    <button
                        onClick={handleSend}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        disabled={!inputText.trim()}
                    >
                        <span>Enviar</span>
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    </div>

    {
        showTransferModal && (
            <TransferModal
                onClose={() => setShowTransferModal(false)}
                onTransfer={handleTransfer}
                currentAgentEmail={currentUser}
            />
        )
    }
        </div >
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
