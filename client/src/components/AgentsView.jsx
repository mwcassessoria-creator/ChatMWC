import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Clock, TrendingUp, Search, Filter } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AgentsView = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgent, setSelectedAgent] = useState(null);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/agents/stats`);
            setAgents(response.data);
        } catch (error) {
            console.error('Error fetching agents:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'busy': return 'bg-yellow-100 text-yellow-700';
            case 'inactive': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500">Carregando atendentes...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Atendentes</h1>
                        <p className="text-sm text-gray-600">{agents.length} atendentes cadastrados</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Agents Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAgents.map(agent => (
                        <div
                            key={agent.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedAgent(agent)}
                        >
                            {/* Agent Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {agent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                                        <p className="text-sm text-gray-500">{agent.email}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                                    {agent.status === 'active' ? 'Ativo' : agent.status === 'busy' ? 'Ocupado' : 'Inativo'}
                                </span>
                            </div>

                            {/* Departments */}
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-2">Departamentos:</p>
                                <div className="flex flex-wrap gap-1">
                                    {agent.departments?.map((dept, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                            {dept.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                                        <MessageSquare size={16} />
                                        <span className="text-xs">Atendimentos</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900">{agent.total_conversations || 0}</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                                        <Clock size={16} />
                                        <span className="text-xs">Ativos</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900">{agent.active_conversations || 0}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredAgents.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-gray-500">Nenhum atendente encontrado</p>
                    </div>
                )}
            </div>

            {/* Agent Detail Modal (optional - can be expanded later) */}
            {selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedAgent(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">{selectedAgent.name}</h2>
                        <p className="text-gray-600 mb-4">{selectedAgent.email}</p>
                        <div className="space-y-2">
                            <p><strong>Status:</strong> {selectedAgent.status}</p>
                            <p><strong>Total de Atendimentos:</strong> {selectedAgent.total_conversations || 0}</p>
                            <p><strong>Atendimentos Ativos:</strong> {selectedAgent.active_conversations || 0}</p>
                        </div>
                        <button
                            onClick={() => setSelectedAgent(null)}
                            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentsView;
