import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SetPassword = ({ email, onPasswordSet }) => {
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = () => {
        if (formData.password.length < 6) {
            return 'A senha deve ter no mínimo 6 caracteres';
        }
        if (formData.password !== formData.confirmPassword) {
            return 'As senhas não coincidem';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validatePassword();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/agents/set-password`, {
                email,
                password: formData.password
            });

            onPasswordSet();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao definir senha');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = () => {
        const len = formData.password.length;
        if (len === 0) return null;
        if (len < 6) return { label: 'Fraca', color: 'bg-red-500', width: '33%' };
        if (len < 10) return { label: 'Média', color: 'bg-yellow-500', width: '66%' };
        return { label: 'Forte', color: 'bg-green-500', width: '100%' };
    };

    const strength = passwordStrength();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <Lock className="text-white" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Primeiro Acesso</h1>
                    <p className="text-gray-600">Defina sua senha para continuar</p>
                    <p className="text-sm text-gray-500 mt-2">{email}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nova Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {strength && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">Força da senha:</span>
                                        <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
                                            {strength.label}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`${strength.color} h-2 rounded-full transition-all duration-300`}
                                            style={{ width: strength.width }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirmar Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Digite a senha novamente"
                                />
                                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                    <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={20} />
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !formData.password || !formData.confirmPassword}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                        >
                            {loading ? 'Salvando...' : 'Definir Senha'}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8 text-sm text-gray-500">
                    <p>© 2026 MWC Assessoria. Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    );
};

export default SetPassword;
