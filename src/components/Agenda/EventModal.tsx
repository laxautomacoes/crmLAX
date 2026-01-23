'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { format, addHours, startOfHour } from 'date-fns';
import { toast } from 'sonner';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    onDelete?: (id: string) => void;
    editingEvent?: any;
    initialDate?: Date;
    leads: any[];
    assets: any[];
}

export default function EventModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
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
        if (editingEvent && isOpen) {
            // Ao editar, garantimos que a data seja tratada como local para o input datetime-local
            const startDate = new Date(editingEvent.start_time);
            const endDate = new Date(editingEvent.end_time);
            
            setFormData({
                title: editingEvent.title,
                description: editingEvent.description || '',
                start_time: format(startDate, "yyyy-MM-dd'T'HH:mm"),
                end_time: format(endDate, "yyyy-MM-dd'T'HH:mm"),
                event_type: editingEvent.event_type,
                lead_id: editingEvent.lead_id || '',
                asset_id: editingEvent.asset_id || '',
                metadata: editingEvent.metadata || {}
            });
        } else if (isOpen) {
            // Para novos eventos, usamos a hora atual "cheia" (ex: se agora são 17:20, sugere 18:00)
            const now = new Date();
            const start = startOfHour(addHours(now, 1));
            
            // Se o usuário clicou em uma data específica no calendário, mantemos o dia mas usamos a hora sugerida
            if (initialDate) {
                start.setFullYear(initialDate.getFullYear());
                start.setMonth(initialDate.getMonth());
                start.setDate(initialDate.getDate());
            }
            
            const end = addHours(start, 1);

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

    const handleStartTimeChange = (value: string) => {
        const newStartTime = value;
        let newEndTime = formData.end_time;

        // Se tivermos um novo horário de início e o horário de fim estiver vazio ou for anterior ao início
        if (newStartTime) {
            const start = new Date(newStartTime);
            const end = formData.end_time ? new Date(formData.end_time) : null;

            if (!end || end <= start) {
                newEndTime = format(addHours(start, 1), "yyyy-MM-dd'T'HH:mm");
            }
        }

        setFormData({ ...formData, start_time: newStartTime, end_time: newEndTime });
    };

    const handleSubmit = () => {
        if (!formData.title || !formData.start_time) {
            toast.error('Título e horário de início são obrigatórios');
            return;
        }

        let finalEndTime = formData.end_time;
        const start = new Date(formData.start_time);

        // Se o horário de fim não foi preenchido, define como 1h após o início
        if (!finalEndTime) {
            finalEndTime = format(addHours(start, 1), "yyyy-MM-dd'T'HH:mm");
        } else {
            const end = new Date(finalEndTime);
            if (end <= start) {
                // Se o usuário preencheu mas é inválido, ajustamos automaticamente para 1h depois
                finalEndTime = format(addHours(start, 1), "yyyy-MM-dd'T'HH:mm");
                toast.info('Horário de término ajustado para 1 hora após o início');
            }
        }

        onSave({ 
            ...formData, 
            start_time: new Date(formData.start_time).toISOString(),
            end_time: new Date(finalEndTime).toISOString() 
        });
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
                    <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Título *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Reunião com Cliente"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Início *</label>
                        <input
                            type="datetime-local"
                            value={formData.start_time}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Fim</label>
                        <input
                            type="datetime-local"
                            value={formData.end_time}
                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Tipo</label>
                    <div className="relative">
                        <select
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all appearance-none pr-10"
                        >
                            <option value="duty">Plantão de Venda</option>
                            <option value="visit">Visita de Cliente</option>
                            <option value="note">Anotação/Lembrete</option>
                            <option value="other">Outro</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Vincular Lead</label>
                    <div className="relative">
                        <select
                            value={formData.lead_id}
                            onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all appearance-none pr-10"
                        >
                            <option value="">Nenhum lead selecionado</option>
                            {leads.map(lead => (
                                <option key={lead.id} value={lead.id}>{lead.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Vincular Imóvel (Produto)</label>
                    <div className="relative">
                        <select
                            value={formData.asset_id}
                            onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all appearance-none pr-10"
                        >
                            <option value="">Nenhum imóvel selecionado</option>
                            {assets.map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted-foreground ml-1 mb-1 uppercase tracking-wider">Descrição</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none resize-none transition-all"
                        placeholder="Detalhes do compromisso..."
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    {editingEvent && onDelete && (
                        <button
                            onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este compromisso?')) {
                                    onDelete(editingEvent.id);
                                }
                            }}
                            className="px-6 py-3 bg-red-600/10 text-red-500 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all border border-red-600/20 active:scale-[0.99]"
                        >
                            Excluir
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-card text-foreground border border-border rounded-lg font-bold hover:bg-muted transition-all active:scale-[0.99]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 shadow-sm active:scale-[0.99] transition-all"
                    >
                        {editingEvent ? 'Salvar Alterações' : 'Agendar'}
                    </button>
                    {formData.lead_id && (
                        <button
                            onClick={handleWhatsAppReminder}
                            className="px-6 py-3 bg-[#25D366] text-white rounded-lg font-bold hover:opacity-90 shadow-sm active:scale-[0.99] transition-all flex items-center gap-2"
                        >
                            WhatsApp
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
