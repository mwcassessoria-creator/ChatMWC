import React, { useState } from 'react';
import { Mail, Lock, LogIn, User, Phone, MessageSquare } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Login = ({ onLogin, onFirstLogin }) => {
    const [isClientMode, setIsClientMode] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    // Client Contact Form Data
    const [contactData, setContactData] = useState({
        name: '',
        phone: '',
        reason: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.email || !formData.password) {
            setError('Preencha todos os campos');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/login`, formData);

            if (response.data.success) {
                const user = response.data.user;

                // Check if first login
                if (response.data.firstLogin) {
                    onFirstLogin?.(user.email);
                } else {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userName', user.name);
                    localStorage.setItem('userRole', user.role);
                    onLogin(user.email);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!contactData.name || !contactData.phone || !contactData.reason) {
            setError('Preencha todos os campos');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/public/contact`, contactData);

            if (response.data.success) {
                setContactSuccess(true);
                // Wait a bit then redirect
                setTimeout(() => {
                    if (response.data.waLink && !response.data.waLink.includes('undefined')) {
                        window.open(response.data.waLink, '_blank');
                    } else {
                        // Fallback if link is bad (bot not connected)
                        setError('Solicitação recebida, mas não foi possível abrir o WhatsApp automaticamente. Aguarde contato.');
                    }
                }, 1500);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao enviar solicitação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-white">MWC</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {isClientMode ? 'Falar com Atendente' : 'Agent Dashboard'}
                    </h1>
                    <p className="text-gray-600">
                        {isClientMode
                            ? 'Preencha seus dados para iniciar o atendimento'
                            : 'Faça login para acessar o painel'}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300">
                    {/* Toggle Switch */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-6 relative">
                        <div className={`w-1/2 h-full absolute top-0 bottom-0 m-1 bg-white rounded-lg shadow-sm transition-all duration-300 ${isClientMode ? 'translate-x-full left-[-8px]' : 'left-0'}`}></div>
                        <button
                            type="button"
                            onClick={() => { setIsClientMode(false); setError(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg relative z-10 transition-colors ${!isClientMode ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Sou Atendente
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsClientMode(true); setError(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg relative z-10 transition-colors ${isClientMode ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Sou Cliente
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {isClientMode && contactSuccess ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Solicitação Criada!</h3>
                            <p className="text-gray-600 mb-6">
                                Você será redirecionado para o WhatsApp para continuar o atendimento.
                            </p>
                            <button
                                onClick={() => setContactSuccess(false)}
                                className="text-blue-600 font-medium hover:underline text-sm"
                            >
                                Voltar
                            </button>
                        </div>
                    ) : isClientMode ? (
                        /* Client Contact Form */
                        <form onSubmit={handleContactSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        required
                                        value={contactData.name}
                                        onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone (WhatsApp)</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="tel"
                                        required
                                        value={contactData.phone}
                                        onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="(DD) 99999-9999"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo do Contato</label>
                                <textarea
                                    required
                                    value={contactData.reason}
                                    onChange={(e) => setContactData({ ...contactData, reason: e.target.value })}
                                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none"
                                    placeholder="Ex: Preciso de segunda via de boleto..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                {loading ? 'Enviando...' : (
                                    <>
                                        <MessageSquare size={20} />
                                        Iniciar Atendimento
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* Agent Login Form */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                {loading ? 'Entrando...' : (
                                    <>
                                        <LogIn size={20} />
                                        Entrar
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500">
                    <p>© 2026 MWC Assessoria. Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
