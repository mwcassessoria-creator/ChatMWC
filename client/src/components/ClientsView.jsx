import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Briefcase, MessageSquare, X, Building, User } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function ClientsView({ onStartChat }) {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        company: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchClients(searchTerm);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const fetchClients = async (search = '') => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/clients`, {
                params: { search }
            });
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}/api/clients`, formData);
            setShowModal(false);
            setFormData({ name: '', phone: '', company: '' });
            fetchClients(); // Refresh list

            // Optional: Start chat immediately
            if (response.data && onStartChat) {
                onStartChat(response.data.chat_id, response.data.id);
            }
        } catch (error) {
            console.error('Error creating client:', error);
            alert('Erro ao cadastrar cliente');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie seus contatos e inicie atendimentos</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <UserPlus size={18} />
                    <span>Novo Cliente</span>
                </button>
            </div>

            {/* Search */}
            <div className="p-6 pb-0">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64 text-gray-500">
                        Carregando...
                    </div>
                ) : clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <User size={48} className="mb-4 opacity-20" />
                        <p>Nenhum cliente encontrado</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clients.map(client => (
                            <div key={client.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 line-clamp-1">{client.name}</h3>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                                                <Building size={12} />
                                                <span className="truncate max-w-[150px]">{client.company || 'Sem empresa'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{client.phone}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onStartChat(client.chat_id, client.id)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition font-medium"
                                >
                                    <MessageSquare size={16} />
                                    <span>Iniciar Atendimento</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">Novo Cliente</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                    <User size={16} className="text-blue-500" />
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    placeholder="Ex: João Silva"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                    <Phone size={16} className="text-blue-500" />
                                    Telefone (WhatsApp) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    placeholder="Ex: 11999998888"
                                />
                                <p className="text-xs text-gray-500 mt-1 ml-1">Apenas números com DDD</p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                    <Building size={16} className="text-blue-500" />
                                    Empresa
                                </label>
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    placeholder="Ex: Empresa Ltda"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Salvando...' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientsView;
