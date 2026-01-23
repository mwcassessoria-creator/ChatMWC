import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Briefcase, MessageSquare, X, Building, User, History, Edit2, FileText, Calendar, Trash2, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function ClientsView({ onStartChat }) {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    // Create/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', company: '' });
    const [submitting, setSubmitting] = useState(false);

    // History (Loaded in side panel now)
    const [clientHistory, setClientHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchClients(searchTerm);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Fetch history when client is selected
    useEffect(() => {
        if (selectedClient) {
            fetchHistory(selectedClient.chat_id);
        } else {
            setClientHistory([]);
        }
    }, [selectedClient]);

    const fetchClients = async (search = '') => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/clients`, {
                params: { search }
            });
            setClients(response.data);

            // Re-select client if updated
            if (selectedClient) {
                const updated = response.data.find(c => c.id === selectedClient.id);
                if (updated) setSelectedClient(updated);
                else setSelectedClient(null); // Deselect if deleted
            }

        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (chatId) => {
        setHistoryLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/clients/${chatId}/history`);
            setClientHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedClient) return;
        const confirm = window.confirm('Tem certeza que deseja remover este cliente da lista? As conversas serão mantidas.');
        if (!confirm) return;

        try {
            await axios.delete(`${API_URL}/api/clients/${selectedClient.id}`);
            setSelectedClient(null);
            fetchClients(searchTerm);
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Erro ao excluir cliente');
        }
    };

    // ... (Modal handlers logic same as before) ...
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
                await axios.put(`${API_URL}/api/clients/${editingClient.id}`, formData);
            } else {
                await axios.post(`${API_URL}/api/clients`, formData);
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Data inv.lida';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex h-full bg-gray-50 overflow-hidden">
            {/* Main Content (Table) */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p className="text-sm text-gray-500 mt-1">Gerencie contatos e histórico</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <UserPlus size={18} />
                        <span>Novo</span>
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 pb-2 shrink-0">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white shadow-sm outline-none"
                        />
                    </div>
                </div>

                {/* Table List */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase border-b border-gray-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Empresa</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-400">Carregando...</td></tr>
                                ) : clients.length === 0 ? (
                                    <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-400">Nenhum cliente encontrado</td></tr>
                                ) : (
                                    clients.map(client => (
                                        <tr
                                            key={client.id}
                                            onClick={() => setSelectedClient(client)}
                                            className={`cursor-pointer transition-colors group ${selectedClient?.id === client.id ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 transition-colors ${selectedClient?.id === client.id ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'}`}>
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
                                            <td className="px-6 py-4 text-gray-400">
                                                <ChevronRight size={20} className={`transform transition-transform ${selectedClient?.id === client.id ? 'text-blue-500 translate-x-1' : 'group-hover:text-gray-600'}`} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            {selectedClient && (
                <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col h-full shadow-xl animate-in slide-in-from-right duration-300">
                    {/* Panel Header */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/10">
                                {selectedClient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 text-lg line-clamp-1">{selectedClient.name}</h2>
                                <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="p-6 flex gap-2 border-b border-gray-100">
                        <button
                            onClick={() => onStartChat(selectedClient.chat_id, selectedClient.id)}
                            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                            <MessageSquare size={18} /> Iniciar Chat
                        </button>
                        <button
                            onClick={() => handleOpenEdit(selectedClient)}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
                            title="Editar"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
                            title="Excluir da lista"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Company Info */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Empresa</h3>
                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                                <Building size={16} className="text-blue-500" />
                                {selectedClient.company || 'Não informada'}
                            </div>
                        </div>

                        {/* History Timeline */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <History size={16} className="text-purple-500" />
                                    Histórico de Tickets
                                </h3>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                    {clientHistory.length}
                                </span>
                            </div>

                            <div className="space-y-4 relative">
                                {/* Vertical Line needs relative positioning context */}
                                {clientHistory.length > 0 && (
                                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200" />
                                )}

                                {historyLoading ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">Carregando histórico...</div>
                                ) : clientHistory.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        Nenhum atendimento anterior.
                                    </div>
                                ) : (
                                    clientHistory.map((ticket, idx) => (
                                        <div key={ticket.id} className="relative pl-10 group">
                                            {/* Timeline Dot */}
                                            <div className="absolute left-3 top-1 w-4 h-4 rounded-full border-2 border-white bg-gray-300 group-hover:bg-purple-500 transition-colors z-10 shadow-sm" />

                                            <div className="bg-white border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${ticket.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mono">{formatDate(ticket.created_at).split(' ')[0]}</span>
                                                </div>

                                                <div className="text-sm text-gray-800 mb-1">
                                                    Atendido por <span className="font-semibold">{ticket.agents?.name || 'Sistema'}</span>
                                                </div>

                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                    {ticket.departments?.name || 'Geral'}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reused (Same as before) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* ... inputs same as before ... */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">Telefone *</label>
                                <input required type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
                                <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded-xl">Cancelar</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl">{submitting ? '...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientsView;
