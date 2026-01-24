import React, { useState } from 'react';
import { X } from 'lucide-react';

const CloseTicketModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [subject, setSubject] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (subject.trim()) {
            onConfirm(subject.trim());
            setSubject('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Encerrar Atendimento</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        disabled={isLoading}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assunto do Atendimento *
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ex: Dúvida sobre impostos, Emissão de nota fiscal..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required
                            disabled={isLoading}
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Descreva brevemente o motivo do atendimento
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            disabled={isLoading || !subject.trim()}
                        >
                            {isLoading ? 'Encerrando...' : 'Encerrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CloseTicketModal;
