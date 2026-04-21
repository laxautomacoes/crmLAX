'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { FormInput } from '@/components/shared/forms/FormInput';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormTextarea } from '@/components/shared/forms/FormTextarea';
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
    properties: any[];
}

export default function EventModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    editingEvent,
    initialDate,
    leads,
    properties
}: EventModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        event_type: 'note',
        lead_id: '',
        property_id: '',
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
                property_id: editingEvent.property_id || '',
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
                property_id: '',
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
                <FormInput
                    label="Título *"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Reunião com Cliente"
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Início *"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="text-xs"
                    />
                    <FormInput
                        label="Fim"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="text-xs"
                    />
                </div>

                <FormSelect
                    label="Tipo"
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    options={[
                        { value: 'duty', label: 'Plantão de Venda' },
                        { value: 'visit', label: 'Visita de Cliente' },
                        { value: 'note', label: 'Anotação/Lembrete' },
                        { value: 'other', label: 'Outro' }
                    ]}
                />

                <FormSelect
                    label="Vincular Lead"
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                    options={[
                        { value: '', label: 'Nenhum lead selecionado' },
                        ...leads.map(lead => ({ value: lead.id, label: lead.name }))
                    ]}
                />

                {formData.lead_id && (
                    <div className="flex items-center gap-2 px-1 py-1 bg-green-50 rounded-lg border border-green-100">
                        <input
                            type="checkbox"
                            id="send_whatsapp_reminder"
                            checked={(formData.metadata as any)?.send_whatsapp_reminder || false}
                            onChange={(e) => setFormData({
                                ...formData,
                                metadata: { ...formData.metadata, send_whatsapp_reminder: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                        />
                        <label htmlFor="send_whatsapp_reminder" className="text-sm font-bold text-green-700 cursor-pointer">
                            Enviar lembrete via WhatsApp (1h antes)
                        </label>
                    </div>
                )}

                <FormSelect
                    label="Vincular Imóvel (Produto)"
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    options={[
                        { value: '', label: 'Nenhum imóvel selecionado' },
                        ...properties.map(property => ({ value: property.id, label: property.title }))
                    ]}
                />

                <FormTextarea
                    label="Descrição"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes do compromisso..."
                    rows={3}
                />

                <div className="flex gap-3 pt-4">
                    {editingEvent && onDelete && (
                        <button
                            onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este compromisso?')) {
                                    onDelete(editingEvent.id);
                                }
                            }}
                            className="px-6 py-3 bg-[#EF4444] text-white rounded-lg font-bold hover:bg-[#DC2626] transition-all active:scale-[0.99] shadow-sm"
                        >
                            Excluir
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="flex-1 whitespace-nowrap py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:bg-[#F2DB00] shadow-sm transform active:scale-[0.99] transition-all"
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
