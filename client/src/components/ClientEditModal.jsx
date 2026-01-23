import React, { useState, useEffect } from 'react';
import { X, User, Phone, Building } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function ClientEditModal({ isOpen, onClose, client, onSuccess }) {
    const [formData, setFormData] = useState({ name: '', phone: '', company: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (client) {
                // Extract phone and clean it up
                let rawPhone = client.phone || '';

                // If phone is missing but we have an ID that looks like a phone ID
                if (!rawPhone && client.id && typeof client.id === 'string' && client.id.includes('@')) {
                    rawPhone = client.id;
                }

                // Clean the phone for display: remove @c.us, ._serialized, etc.
                // Also remove any non-digit characters to be safe for the input
                const cleanPhone = rawPhone.toString().replace(/@c\.us|@g\.us/g, '').replace(/\D/g, '');

                setFormData({
                    name: client.name || '',
                    phone: cleanPhone,
                    company: client.company || ''
                });
            } else {
                setFormData({ name: '', phone: '', company: '' });
            }
        }
    }, [isOpen, client]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (client) {
                // Update existing
                await axios.put(`${API_URL}/api/clients/${client.id}`, formData);
            } else {
                // Create new
                await axios.post(`${API_URL}/api/clients`, formData);
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Erro ao salvar cliente');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {client ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <button
                        onClick={onClose}
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
                            onClick={onClose}
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
    );
}

export default ClientEditModal;
