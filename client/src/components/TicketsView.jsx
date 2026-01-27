import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Filter, Search, Calendar, User, Building, ExternalLink, TicketCheck, XCircle, CheckCircle, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TicketsView = ({ onOpenChat }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [agents, setAgents] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        departmentId: '',
        agentId: ''
    });

    useEffect(() => {
        fetchDependencies();
        fetchTickets();
    }, []);

    const fetchDependencies = async () => {
        try {
            const [deptRes, agentRes] = await Promise.all([
                axios.get(`${API_URL}/api/departments`),
                axios.get(`${API_URL}/api/agents`)
            ]);
            setDepartments(deptRes.data);
            setAgents(agentRes.data);
        } catch (error) {
            console.error('Error fetching dependencies:', error);
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.status) params.status = filters.status;
            if (filters.departmentId) params.departmentId = filters.departmentId;
            if (filters.agentId) params.agentId = filters.agentId;

            const response = await axios.get(`${API_URL}/api/tickets`, { params });
            setTickets(response.data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchTickets();
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1"><TicketCheck size={12} /> Aberto</span>;
            case 'closed':
                return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Fechado</span>;
            case 'transferred':
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1"><ExternalLink size={12} /> Transferido</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header / Filters */}
            <div className="bg-white border-b p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TicketCheck className="text-blue-600" />
                        Gestão de Tickets
                    </h1>
                    <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {tickets.length} tickets encontrados
                    </span>
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Date Range */}
                    <div className="col-span-2 flex gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Início</label>
                            <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Fim</label>
                            <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="open">Abertos</option>
                            <option value="closed">Fechados</option>
                            <option value="transferred">Transferidos</option>
                        </select>
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Departamento</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={filters.departmentId}
                            onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                        >
                            <option value="">Todos</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Button */}
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                        >
                            {loading ? <Clock className="animate-spin" size={18} /> : <Search size={18} />}
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b text-slate-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Ticket ID</th>
                                <th className="p-4 font-semibold">Data Criação</th>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Departamento</th>
                                <th className="p-4 font-semibold">Atendente</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        Carregando tickets...
                                    </td>
                                </tr>
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        Nenhum ticket encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-xs text-blue-600 font-medium">
                                            #{ticket.id.slice(0, 8)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span>{formatDate(ticket.created_at)}</span>
                                                {ticket.closed_at && (
                                                    <span className="text-xs text-gray-400">Enc: {formatDate(ticket.closed_at)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium">
                                            {ticket.conversations?.name || 'Cliente Desconhecido'}
                                            <div className="text-xs text-gray-400 font-normal">
                                                {ticket.conversations?.phone}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs">
                                                <Building size={12} />
                                                {ticket.departments?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {ticket.agents ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                                        {ticket.agents.name.charAt(0)}
                                                    </div>
                                                    <span>{ticket.agents.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Não atribuído</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(ticket.status)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => onOpenChat(ticket.conversations?.chat_id, ticket.id)}
                                                className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                                                title="Abrir Conversa"
                                            >
                                                Ver Chat <ExternalLink size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TicketsView;
