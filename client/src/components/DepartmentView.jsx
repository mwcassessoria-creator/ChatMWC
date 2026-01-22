import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function DepartmentView({ currentUser }) {
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [deptConversations, setDeptConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (selectedDept) {
            fetchDepartmentConversations(selectedDept.id);
        }
    }, [selectedDept]);

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/departments`);
            setDepartments(response.data);
            if (response.data.length > 0) {
                setSelectedDept(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartmentConversations = async (deptId) => {
        try {
            const response = await axios.get(`${API_URL}/api/departments/${deptId}/conversations`);
            setDeptConversations(response.data);
        } catch (error) {
            console.error('Error fetching department conversations:', error);
        }
    };

    const handleAssignToMe = async (conversationId) => {
        try {
            await axios.post(`${API_URL}/api/conversations/${conversationId}/assign-to-me`, {
                agentEmail: currentUser
            });
            // Refresh the list
            fetchDepartmentConversations(selectedDept.id);
            alert('Conversa atribuída com sucesso!');
        } catch (error) {
            console.error('Error assigning conversation:', error);
            alert('Erro ao atribuir conversa. Pode já estar atribuída a outro agente.');
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Carregando departamentos...</div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-50">
            {/* Department List */}
            <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Departamentos</h2>
                </div>
                <div className="p-2">
                    {departments.map((dept) => (
                        <div
                            key={dept.id}
                            onClick={() => setSelectedDept(dept)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${selectedDept?.id === dept.id
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'hover:bg-gray-50 text-gray-700'
                                }`}
                        >
                            <div className="font-medium">{dept.name}</div>
                            {dept.description && (
                                <div className="text-xs text-gray-500 mt-1">{dept.description}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Conversations for Selected Department */}
            <div className="flex-1 flex flex-col">
                {selectedDept ? (
                    <>
                        <div className="bg-white border-b border-gray-200 p-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                {selectedDept.name}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {deptConversations.length} conversas
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {deptConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p>Nenhuma conversa neste departamento</p>
                                </div>
                            ) : (
                                deptConversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        className="bg-white border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900 truncate">
                                                        {conv.conversations?.name || 'Cliente'}
                                                    </h3>
                                                    {conv.status === 'queued' && (
                                                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                                                            Na Fila
                                                        </span>
                                                    )}
                                                    {conv.status === 'active' && (
                                                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                                            Ativo
                                                        </span>
                                                    )}
                                                    {conv.status === 'closed' && (
                                                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">
                                                            Resolvido
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {conv.conversations?.phone}
                                                </p>
                                                {conv.agents ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">Atendente:</span>
                                                        <span className="text-xs font-medium text-blue-600">
                                                            {conv.agents.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAssignToMe(conv.conversation_id)}
                                                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                        Assumir Conversa
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-right ml-4">
                                                <span className="text-xs text-gray-500">
                                                    {formatTime(conv.conversations?.last_message_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Selecione um departamento
                    </div>
                )}
            </div>
        </div>
    );
}

export default DepartmentView;
