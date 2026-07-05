'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { FormInput } from '@/components/shared/forms/FormInput'
import { LeadAutocomplete } from '@/components/dashboard/leads/LeadAutocomplete'
import { PropertyAutocomplete } from '@/components/dashboard/properties/PropertyAutocomplete'
import { MediaUpload } from '@/components/shared/MediaUpload'
import { Calendar } from 'lucide-react'
import { createNote, updateNote } from '@/app/_actions/notes'
import { toast } from 'sonner'

interface NoteModalProps {
    isOpen: boolean
    onClose: () => void
    editingNote?: any
    tenantId: string
    onSaveSuccess: () => void
}

export function NoteModal({ isOpen, onClose, editingNote, tenantId, onSaveSuccess }: NoteModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        content: '',
        date: new Date().toISOString().split('T')[0],
        lead_id: null as string | null,
        property_id: null as string | null,
        attachments: [] as any[],
        selectedLead: null as any,
        selectedProperty: null as any,
        is_visit: false,
        visit_number: 1,
        visit_unregistered_property: '',
        isRegisteredProperty: true
    })

    useEffect(() => {
        if (editingNote && isOpen) {
            const hasRegisteredProperty = !!editingNote.property_id || !editingNote.visit_unregistered_property
            setFormData({
                content: editingNote.content || '',
                date: editingNote.date || new Date().toISOString().split('T')[0],
                lead_id: editingNote.lead_id || null,
                property_id: editingNote.property_id || null,
                attachments: editingNote.attachments || [],
                selectedLead: editingNote.leads || null,
                selectedProperty: editingNote.properties || null,
                is_visit: editingNote.is_visit || false,
                visit_number: editingNote.visit_number || 1,
                visit_unregistered_property: editingNote.visit_unregistered_property || '',
                isRegisteredProperty: hasRegisteredProperty
            })
        } else {
            setFormData({
                content: '',
                date: new Date().toISOString().split('T')[0],
                lead_id: null,
                property_id: null,
                attachments: [],
                selectedLead: null,
                selectedProperty: null,
                is_visit: false,
                visit_number: 1,
                visit_unregistered_property: '',
                isRegisteredProperty: true
            })
        }
    }, [editingNote, isOpen])

    const handleSave = async () => {
        if (!formData.content.trim()) return

        setIsLoading(true)
        try {
            const dataToSave: any = {
                content: formData.content,
                date: formData.date,
                lead_id: formData.lead_id,
                property_id: (formData.is_visit && formData.isRegisteredProperty) ? formData.property_id : (!formData.is_visit ? formData.property_id : null),
                attachments: formData.attachments,
                is_visit: formData.is_visit,
                visit_number: formData.is_visit ? formData.visit_number : null,
                visit_unregistered_property: (formData.is_visit && !formData.isRegisteredProperty) ? formData.visit_unregistered_property.trim() : null
            }
            if (formData.selectedLead) {
                dataToSave.contact_id = formData.selectedLead.contact_id || null
            }

            const result = editingNote 
                ? await updateNote(editingNote.id, dataToSave)
                : await createNote(tenantId, dataToSave)

            if (result.success) {
                toast.success(editingNote ? 'Nota atualizada!' : 'Nota criada com sucesso!')
                onSaveSuccess()
                onClose()
            } else {
                toast.error('Erro ao salvar nota: ' + result.error)
            }
        } catch (error: any) {
            console.error('Error saving note:', error)
            toast.error('Erro inesperado: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingNote ? "Editar Nota" : "Nova Nota"}
            size="xl"
            extraHeaderContent={
                <button
                    onClick={handleSave}
                    disabled={isLoading || !formData.content.trim()}
                    className="px-4 py-2 text-xs font-bold bg-[#FFE600] text-[#404F4F] hover:bg-[#F2DB00] rounded-lg transition-all disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                >
                    {isLoading ? 'Salvando...' : (editingNote ? "Salvar" : "Criar Nota")}
                </button>
            }
        >
            <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* Cabeçalho de Configurações */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-[145px] flex-shrink-0">
                        <FormInput
                            label="Data"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <PropertyAutocomplete
                            tenantId={tenantId}
                            showIcon={false}
                            selectedItem={formData.selectedProperty}
                            onSelect={(property) => setFormData(prev => ({ ...prev, selectedProperty: property, property_id: property.id }))}
                            onClear={() => setFormData(prev => ({ ...prev, selectedProperty: null, property_id: null }))}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <LeadAutocomplete
                            tenantId={tenantId}
                            showIcon={false}
                            selectedItem={formData.selectedLead}
                            onSelect={(lead) => setFormData(prev => ({ ...prev, selectedLead: lead, lead_id: lead.id }))}
                            onClear={() => setFormData(prev => ({ ...prev, selectedLead: null, lead_id: null }))}
                        />
                    </div>
                </div>

                {formData.lead_id && (
                    <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="note-is-visit-checkbox"
                                checked={formData.is_visit}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_visit: e.target.checked }))}
                                className="rounded border-muted-foreground/30 text-secondary focus:ring-secondary cursor-pointer h-4 w-4"
                            />
                            <label htmlFor="note-is-visit-checkbox" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                Registrar como Visita
                            </label>
                        </div>

                        {formData.is_visit && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-foreground ml-1 mb-2">Visita</label>
                                    <select
                                        value={formData.visit_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, visit_number: Number(e.target.value) }))}
                                        className="h-[38px] w-full bg-background border border-muted-foreground/30 rounded-lg px-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                            <option key={num} value={num}>{num}ª Visita</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-foreground ml-1 mb-2">Tipo de Imóvel</label>
                                    <div className="flex items-center gap-4 h-[38px]">
                                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer font-medium">
                                            <input
                                                type="radio"
                                                name="notePropertyType"
                                                checked={formData.isRegisteredProperty}
                                                onChange={() => setFormData(prev => ({ ...prev, isRegisteredProperty: true }))}
                                                className="text-secondary focus:ring-secondary h-4 w-4"
                                            />
                                            Cadastrado (Selecionado acima)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer font-medium">
                                            <input
                                                type="radio"
                                                name="notePropertyType"
                                                checked={!formData.isRegisteredProperty}
                                                onChange={() => setFormData(prev => ({ ...prev, isRegisteredProperty: false }))}
                                                className="text-secondary focus:ring-secondary h-4 w-4"
                                            />
                                            Não Cadastrado
                                        </label>
                                    </div>
                                </div>

                                {!formData.isRegisteredProperty && (
                                    <div className="md:col-span-2">
                                        <FormInput
                                            label="Nome/Descrição do Imóvel"
                                            value={formData.visit_unregistered_property}
                                            onChange={(e) => setFormData(prev => ({ ...prev, visit_unregistered_property: e.target.value }))}
                                            placeholder="Digite a identificação ou endereço do imóvel..."
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="border-t border-border/60" />

                {/* Área de Escrita */}
                <div className="space-y-2">
                    <FormRichTextarea
                        value={formData.content}
                        onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                        placeholder="Escreva sua nota aqui"
                    />
                </div>

                <div className="border-t border-border/60" />

                {/* Upload de Arquivos */}
                <div className="space-y-2">
                    <MediaUpload
                        pathPrefix={`notes/${tenantId}`}
                        images={formData.attachments.filter(a => a.type === 'images').map(a => a.url)}
                        videos={formData.attachments.filter(a => a.type === 'videos').map(a => a.url)}
                        documents={formData.attachments.filter(a => a.type === 'documents').map(a => ({ name: a.name, url: a.url }))}
                        onUpload={(type, files) => {
                            const newAttachments = files.map(file => {
                                if (type === 'documents') {
                                    return { type, name: (file as any).name, url: (file as any).url }
                                }
                                return { type, url: file }
                            })
                            setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }))
                        }}
                        onRemove={(type, index) => {
                            const filtered = formData.attachments.filter(a => a.type === type)
                            const others = formData.attachments.filter(a => a.type !== type)
                            const remaining = filtered.filter((_, i) => i !== index)
                            setFormData(prev => ({ ...prev, attachments: [...others, ...remaining] }))
                        }}
                    />
                </div>
            </div>
        </Modal>
    )
}
