import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings, UserPlus, LogOut, LayoutDashboard, Inbox, TicketCheck } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Sidebar = ({ status, onLogout, onNavigate, currentView, currentUser, stats }) => {
    const [agentInfo, setAgentInfo] = useState(null);

    useEffect(() => {
        if (currentUser) {
            fetchAgentInfo();
        }
    }, [currentUser]);

    const fetchAgentInfo = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/agents`);
            const agent = response.data.find(a => a.email === currentUser);
            if (agent) {
                setAgentInfo(agent);
            }
        } catch (error) {
            console.error('Error fetching agent info:', error);
        }
    };
    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'bg-green-500';
            case 'disconnected': return 'bg-red-500';
            case 'qr_needed': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connected': return 'Online';
            case 'disconnected': return 'Disconnected';
            case 'qr_needed': return 'Scan QR';
            default: return 'Connecting...';
        }
    };

    return (
        <div className="flex-none">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 bg-[#0f172a] text-gray-300 flex-col h-screen font-sans shrink-0">
                {/* Header */}
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
                            {agentInfo?.name?.charAt(0)?.toUpperCase() || 'AD'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-bold text-white leading-tight truncate">
                                {agentInfo?.name || 'Agent Dashboard'}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${getStatusColor()}`}></span>
                                <span className="text-xs text-gray-400 font-medium">{getStatusText()}</span>
                            </div>
                            {agentInfo?.agent_departments && agentInfo.agent_departments.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {agentInfo.agent_departments.map((ad, idx) => (
                                        <span
                                            key={idx}
                                            className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded border border-blue-800/30"
                                        >
                                            {ad.departments?.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider pl-3">
                        Menu
                    </div>

                    <nav className="space-y-2">
                        <NavItem
                            icon={<MessageSquare size={20} />}
                            label="Minhas Conversas"
                            onClick={() => onNavigate?.('my-conversations')}
                            active={currentView === 'my-conversations'}
                            badge={stats?.queued > 0 ? stats.queued : null}
                        />
                        <NavItem
                            icon={<TicketCheck size={20} />}
                            label="Gestão de Tickets"
                            onClick={() => onNavigate?.('tickets')}
                            active={currentView === 'tickets'}
                        />
                        <NavItem
                            icon={<Inbox size={20} />}
                            label="Todas Conversas"
                            onClick={() => onNavigate?.('all-conversations')}
                            active={currentView === 'all-conversations'}
                        />
                        <NavItem
                            icon={<Users size={20} />}
                            label="Clientes"
                            onClick={() => onNavigate?.('clients')}
                            active={currentView === 'clients'}
                        />
                        <NavItem
                            icon={<Users size={20} />}
                            label="Atendentes"
                            onClick={() => onNavigate?.('agents')}
                            active={currentView === 'agents'}
                        />
                        <NavItem
                            icon={<LayoutDashboard size={20} />}
                            label="Departamentos"
                            onClick={() => onNavigate?.('departments')}
                            active={currentView === 'departments'}
                        />
                    </nav>
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto p-6 space-y-2">
                    <NavItem
                        icon={<UserPlus size={20} />}
                        label="Cadastrar Atendente"
                        onClick={() => window.dispatchEvent(new CustomEvent('openAgentRegistration'))}
                    />
                    <NavItem icon={<Settings size={20} />} label="Settings" />
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
                    >
                        <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] text-gray-400 border-t border-gray-800 z-50 flex justify-around items-center px-2 py-2 pb-safe shadow-xl">
                <NavItemMobile
                    icon={<MessageSquare size={20} />}
                    label="Chat"
                    onClick={() => onNavigate?.('my-conversations')}
                    active={currentView === 'my-conversations'}
                    badge={stats?.queued > 0 ? stats.queued : null}
                />
                <NavItemMobile
                    icon={<TicketCheck size={20} />}
                    label="Tickets"
                    onClick={() => onNavigate?.('tickets')}
                    active={currentView === 'tickets'}
                />
                <NavItemMobile
                    icon={<Inbox size={20} />}
                    label="Todas"
                    onClick={() => onNavigate?.('all-conversations')}
                    active={currentView === 'all-conversations'}
                />
                <NavItemMobile
                    icon={<Users size={20} />}
                    label="Clientes"
                    onClick={() => onNavigate?.('clients')}
                    active={currentView === 'clients'}
                />
                <NavItemMobile
                    icon={<LayoutDashboard size={20} />}
                    label="Deptos"
                    onClick={() => onNavigate?.('departments')}
                    active={currentView === 'departments'}
                />
                {/* Simple logout for mobile */}
                <button onClick={onLogout} className="flex flex-col items-center gap-1 p-2 rounded-lg text-red-400">
                    <LogOut size={20} />
                    <span className="text-[10px] font-medium">Sair</span>
                </button>
            </div>
            <div className="md:hidden h-16 shrink-0"></div>
        </div>
    );
};

const NavItem = ({ icon, label, active, count, onClick, badge }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group ${active
                ? 'bg-[#1e293b] text-blue-400 shadow-sm'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                }`}
        >
            <div className="flex items-center gap-3">
                <span className={active ? 'text-blue-500' : 'group-hover:text-gray-300'}>
                    {icon}
                </span>
                <span className="font-medium">{label}</span>
            </div>
            {(count || badge) && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge
                    ? 'bg-red-500 text-white animate-pulse'
                    : (active ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-500')
                    }`}>
                    {badge || count}
                </span>
            )}
        </button>
    );
};

const NavItemMobile = ({ icon, label, active, onClick, badge }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all relative ${active ? 'text-blue-400 bg-white/5' : 'hover:text-gray-200'
                }`}
        >
            <div className="relative">
                {React.cloneElement(icon, { fill: active ? "currentColor" : "none" })}
                {badge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>
                )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    )
}

export default Sidebar;
