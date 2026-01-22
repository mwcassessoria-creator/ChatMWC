import React from 'react';
import { MessageSquare, Users, Settings, UserPlus, LogOut, LayoutDashboard } from 'lucide-react';

const Sidebar = ({ status, onLogout, onNavigate, currentView }) => {
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
        <div className="w-64 bg-[#0f172a] text-gray-300 flex flex-col h-screen font-sans">
            {/* Header */}
            <div className="p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
                        AD
                    </div>
                    <div>
                        <h2 className="font-bold text-white leading-tight">Agent Dashboard</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`}></span>
                            <span className="text-xs text-gray-400 font-medium">{getStatusText()}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider pl-3">
                    Menu
                </div>

                <nav className="space-y-2">
                    <NavItem
                        icon={<MessageSquare size={20} />}
                        label="Conversas"
                        onClick={() => onNavigate?.('conversations')}
                        active={currentView === 'conversations' || currentView === 'my-conversations'} // Simplification for demo
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
    );
};

const NavItem = ({ icon, label, active, count, onClick }) => {
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
            {count && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-500'
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );
};

export default Sidebar;
