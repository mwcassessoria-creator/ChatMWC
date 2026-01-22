import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserArrowLeft, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TransferModal = ({ onClose, onTransfer, currentAgentEmail }) => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgent, setSelectedAgent] = useState(null);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/agents`);
                setAgents(response.data);
            } catch (error) {
                console.error("Error fetching agents:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, []);

    const filteredAgents = agents.filter(agent =>
        (agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        agent.email !== currentAgentEmail // Don't show current agent
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <UserArrowLeft size={20} className="text-blue-600" />
                        Transferir Atendimento
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar atendente..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                        {loading ? (
                            <p className="text-center text-gray-500 py-4">Carregando atendentes...</p>
                        ) : filteredAgents.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">Nenhum atendente encontrado.</p>
                        ) : (
                            filteredAgents.map(agent => (
                                <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgent(agent)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedAgent?.id === agent.id
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                            : 'border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                        {agent.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-gray-900 text-sm">{agent.name}</p>
                                        <p className="text-xs text-gray-500">{agent.departments?.map(d => d.name).join(', ') || 'Nenhum depto.'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => selectedAgent && onTransfer(selectedAgent.id)}
                            disabled={!selectedAgent}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Transferir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;
