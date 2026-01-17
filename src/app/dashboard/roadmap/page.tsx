'use client';

import { useState, useEffect } from 'react';
import { getUpdates, createUpdate, deleteUpdate } from '@/app/_actions/roadmap';
import { getProfile } from '@/app/_actions/profile';
import { Rocket, Plus, Trash2, Calendar, Star, Bug, Zap, Loader2, X } from 'lucide-react';

export default function RoadmapPage() {
    const [updates, setUpdates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'feature' | 'fix' | 'roadmap'>('feature');
    const [status, setStatus] = useState('Em andamento');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadData() {
            const [updatesRes, profileRes] = await Promise.all([
                getUpdates(),
                getProfile()
            ]);
            setUpdates(updatesRes.updates || []);
            setUserRole(profileRes.profile?.role || 'user');
            setLoading(false);
        }
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const res = await createUpdate({ title, description, type, status });
        if (res.success) {
            setTitle('');
            setDescription('');
            setShowForm(false);
            const { updates } = await getUpdates();
            setUpdates(updates);
        } else {
            alert(res.error || 'Erro ao criar atualização');
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta atualização?')) return;
        const res = await deleteUpdate(id);
        if (res.success) {
            setUpdates(prev => prev.filter(u => u.id !== id));
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FFE600]" />
            </div>
        );
    }

    const typeIcons = {
        feature: <Star className="w-4 h-4" />,
        fix: <Bug className="w-4 h-4" />,
        roadmap: <Zap className="w-4 h-4" />
    };

    const typeColors = {
        feature: 'bg-green-100 text-green-700 border-green-200',
        fix: 'bg-red-100 text-red-700 border-red-200',
        roadmap: 'bg-blue-100 text-blue-700 border-blue-200'
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#404F4F]">Roadmap & Updates</h2>
                    <p className="text-gray-500">Acompanhe a evolução do CRM LAX</p>
                </div>
                {userRole === 'superadmin' && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] px-6 py-3 rounded-lg font-bold transition-all shadow-sm active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Atualização
                    </button>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-[#404F4F] text-lg">Adicionar Atualização</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-800 ml-1">Título</label>
                                <input
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-[#FFE600]/50 outline-none"
                                    placeholder="Ex: Novo Filtro de Clientes"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-800 ml-1">Tipo</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-[#FFE600]/50 outline-none"
                                >
                                    <option value="feature">Nova Feature</option>
                                    <option value="fix">Correção de Bug</option>
                                    <option value="roadmap">Roadmap / Futuro</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-800 ml-1">Descrição</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-[#FFE600]/50 outline-none resize-none"
                                    placeholder="Descreva o que mudou..."
                                />
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full py-4 bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Salvando...' : 'Salvar Atualização'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Updates List */}
            <div className="space-y-6">
                {updates.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhuma atualização registrada ainda.</p>
                    </div>
                ) : (
                    updates.map((update) => (
                        <div key={update.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-gray-200 transition-all flex flex-col md:flex-row gap-6 relative group">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5 ${typeColors[update.type as keyof typeof typeColors]}`}>
                                        {typeIcons[update.type as keyof typeof typeIcons]}
                                        {update.type}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(update.published_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-[#404F4F]">{update.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{update.description}</p>
                            </div>
                            {userRole === 'superadmin' && (
                                <button
                                    onClick={() => handleDelete(update.id)}
                                    className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 transition-all md:relative md:top-0 md:right-0 md:self-start md:opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
