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
        selectedProperty: null as any
    })

    useEffect(() => {
        if (editingNote && isOpen) {
            setFormData({
                content: editingNote.content || '',
                date: editingNote.date || new Date().toISOString().split('T')[0],
                lead_id: editingNote.lead_id || null,
                property_id: editingNote.property_id || null,
                attachments: editingNote.attachments || [],
                selectedLead: editingNote.leads || null,
                selectedProperty: editingNote.properties || null
            })
        } else {
            setFormData({
                content: '',
                date: new Date().toISOString().split('T')[0],
                lead_id: null,
                property_id: null,
                attachments: [],
                selectedLead: null,
                selectedProperty: null
            })
        }
    }, [editingNote, isOpen])

    const handleSave = async () => {
        if (!formData.content.trim()) return

        setIsLoading(true)
        try {
            const dataToSave = {
                content: formData.content,
                date: formData.date,
                lead_id: formData.lead_id,
                property_id: formData.property_id,
                attachments: formData.attachments
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
