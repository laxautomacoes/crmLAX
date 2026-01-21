'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/shared/Modal';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    editingEvent?: any;
    initialDate?: Date;
    leads: any[];
    assets: any[];
}

export default function EventModal({
    isOpen,
    onClose,
    onSave,
    editingEvent,
    initialDate,
    leads,
    assets
}: EventModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        event_type: 'note',
        lead_id: '',
        asset_id: '',
        metadata: {}
    });

    useEffect(() => {
        if (editingEvent) {
            setFormData({
                title: editingEvent.title,
                description: editingEvent.description || '',
                start_time: format(new Date(editingEvent.start_time), "yyyy-MM-dd'T'HH:mm"),
                end_time: format(new Date(editingEvent.end_time), "yyyy-MM-dd'T'HH:mm"),
                event_type: editingEvent.event_type,
                lead_id: editingEvent.lead_id || '',
                asset_id: editingEvent.asset_id || '',
                metadata: editingEvent.metadata || {}
            });
        } else if (initialDate) {
            const start = new Date(initialDate);
            start.setHours(9, 0, 0, 0);
            const end = new Date(initialDate);
            end.setHours(10, 0, 0, 0);

            setFormData({
                title: '',
                description: '',
                start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
                end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
                event_type: 'note',
                lead_id: '',
                asset_id: '',
                metadata: {}
            });
        }
    }, [editingEvent, initialDate, isOpen]);

    const handleSubmit = () => {
        if (!formData.title || !formData.start_time || !formData.end_time) {
            toast.error('Título e horários são obrigatórios');
            return;
        }
        onSave(formData);
    };

    const handleWhatsAppReminder = () => {
        const lead = leads.find(l => l.id === formData.lead_id);
        if (!lead || !lead.phone) {
            toast.error('Selecione um lead com telefone para enviar lembrete');
            return;
        }

        const dateStr = format(new Date(formData.start_time), "dd/MM 'às' HH:mm");
        const message = `Olá ${lead.name}, confirmando nosso agendamento (${formData.title}) para o dia ${dateStr}. Nos vemos lá!`;
        const url = `https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingEvent ? 'Editar Compromisso' : 'Novo Compromisso'}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Título *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Reunião com Cliente"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Início *</label>
                        <input
                            type="datetime-local"
                            value={formData.start_time}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Fim *</label>
                        <input
                            type="datetime-local"
                            value={formData.end_time}
                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Tipo</label>
                    <select
                        value={formData.event_type}
                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none"
                    >
                        <option value="duty">Plantão de Venda</option>
                        <option value="visit">Visita de Cliente</option>
                        <option value="note">Anotação/Lembrete</option>
                        <option value="other">Outro</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Vincular Lead</label>
                    <select
                        value={formData.lead_id}
                        onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none"
                    >
                        <option value="">Nenhum lead selecionado</option>
                        {leads.map(lead => (
                            <option key={lead.id} value={lead.id}>{lead.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Vincular Imóvel (Produto)</label>
                    <select
                        value={formData.asset_id}
                        onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none"
                    >
                        <option value="">Nenhum imóvel selecionado</option>
                        {assets.map(asset => (
                            <option key={asset.id} value={asset.id}>{asset.title}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 ml-1 mb-1">Descrição</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-yellow-400/50 outline-none resize-none"
                        placeholder="Detalhes do compromisso..."
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 bg-yellow-400 text-zinc-900 rounded-lg font-bold hover:bg-yellow-500 shadow-sm active:scale-[0.99] transition-all"
                    >
                        {editingEvent ? 'Salvar Alterações' : 'Agendar'}
                    </button>
                    {formData.lead_id && (
                        <button
                            onClick={handleWhatsAppReminder}
                            className="px-4 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 shadow-sm active:scale-[0.99] transition-all flex items-center gap-2"
                        >
                            WhatsApp
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
