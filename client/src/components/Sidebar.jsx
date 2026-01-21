import React from 'react';
import { LayoutDashboard, Inbox, Wallet, LifeBuoy, ShoppingCart, Settings, User, LogOut, Users } from 'lucide-react';

const Sidebar = ({ status, onLogout, onNavigate }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'bg-green-500';
            case 'disconnected': return 'bg-red-500';
            case 'qr_needed': return 'bg-yellow-500';
            default: return 'bg-gray-400';
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
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold">
                        AD
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">Agent Dashboard</h2>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`}></span>
                            <span className="text-xs text-gray-600 font-medium">{getStatusText()}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Menu
                </div>

                <nav className="space-y-1">
                    <NavItem icon={<Inbox size={20} />} label="Conversas" onClick={() => onNavigate?.('conversations')} active />
                    <NavItem icon={<Users size={20} />} label="Atendentes" onClick={() => onNavigate?.('agents')} />
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-gray-100 space-y-1">
                <NavItem icon={<User size={20} />} label="Cadastrar Atendente" onClick={() => window.dispatchEvent(new CustomEvent('openAgentRegistration'))} />
                <NavItem icon={<Settings size={20} />} label="Settings" />
                <NavItem icon={<LogOut size={20} />} label="Sair" onClick={onLogout} />
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, count, onClick }) => {
    return (
        <div onClick={onClick} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <div className="flex items-center gap-3">
                {icon}
                <span className="font-medium">{label}</span>
            </div>
            {count && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                </span>
            )}
        </div>
    );
};

export default Sidebar;
