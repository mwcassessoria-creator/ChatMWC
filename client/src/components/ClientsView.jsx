import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Briefcase, MessageSquare, X, Building, User, History, Edit2, FileText, Calendar } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function ClientsView({ onStartChat }) {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Create/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', company: '' });
    const [submitting, setSubmitting] = useState(false);

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [clientHistory, setClientHistory] = useState([]);
    const [selectedHistoryClient, setSelectedHistoryClient] = useState(null);

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

    const handleOpenCreate = () => {
        setEditingClient(null);
        setFormData({ name: '', phone: '', company: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            phone: client.phone || '',
            company: client.company || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingClient) {
                // Update
                await axios.put(`${API_URL}/api/clients/${editingClient.id}`, formData);
            } else {
                // Create
                const response = await axios.post(`${API_URL}/api/clients`, formData);
                if (response.data && onStartChat && !editingClient) {
                    // Optional: auto-start chat only on create
                }
            }
            setShowModal(false);
            fetchClients(searchTerm);
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Erro ao salvar cliente');
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewHistory = async (client) => {
        setSelectedHistoryClient(client);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/clients/${client.chat_id}/history`);
            setClientHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
            setClientHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data inv.lida';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getDuration = (start, end) => {
        if (!end) return 'Em andamento';
        const diff = new Date(end) - new Date(start); // ms
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
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
                    onClick={handleOpenCreate}
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

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-400 flex flex-col items-center">
                                        <User size={32} className="mb-2 opacity-30" />
                                        Nenhum cliente encontrado
                                    </td>
                                </tr>
                            ) : (
                                clients.map(client => (
                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-base">{client.name}</div>
                                                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5 font-mono">
                                                        <Phone size={12} />
                                                        {client.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Building size={14} className="text-gray-400" />
                                                <span className="text-sm">{client.company || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewHistory(client)}
                                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                                    title="Histórico de Tickets"
                                                >
                                                    <History size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(client)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Editar Cliente"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onStartChat(client.chat_id, client.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium ml-2 shadow-sm"
                                                >
                                                    <MessageSquare size={16} />
                                                    Chat
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                                />
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
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition disabled:opacity-50"
                                >
                                    {submitting ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Histórico de Atendimentos</h2>
                                    <p className="text-sm text-gray-500">{selectedHistoryClient?.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {historyLoading ? (
                                <div className="text-center py-10 text-gray-500">Carregando histórico...</div>
                            ) : clientHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <FileText size={48} className="mb-4 opacity-20" />
                                    <p>Nenhum ticket encontrado para este cliente.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {clientHistory.map(ticket => (
                                        <div key={ticket.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">#{ticket.id.slice(0, 8)}</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {ticket.status === 'open' ? 'Aberto' : 'Encerrado'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(ticket.created_at)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500 text-xs mb-1">Atendente</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                            {ticket.agents?.name?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="text-gray-700 font-medium">{ticket.agents?.name || 'Não atribuído'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs mb-1">Departamento</p>
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-medium border border-purple-100">
                                                        {ticket.departments?.name || 'Geral'}
                                                    </span>
                                                </div>
                                            </div>

                                            {ticket.closed_at && (
                                                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
                                                    <span>Encerrado em: {formatDate(ticket.closed_at)}</span>
                                                    <span>Duração: {getDuration(ticket.created_at, ticket.closed_at)}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientsView;
