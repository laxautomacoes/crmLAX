'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormRichTextarea } from '@/components/shared/forms/FormRichTextarea'
import { FormInput } from '@/components/shared/forms/FormInput'
import { LeadAutocomplete } from '@/components/dashboard/leads/LeadAutocomplete'
import { AssetAutocomplete } from '@/components/dashboard/assets/AssetAutocomplete'
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
        asset_id: null as string | null,
        attachments: [] as any[],
        selectedLead: null as any,
        selectedAsset: null as any
    })

    useEffect(() => {
        if (editingNote && isOpen) {
            setFormData({
                content: editingNote.content || '',
                date: editingNote.date || new Date().toISOString().split('T')[0],
                lead_id: editingNote.lead_id || null,
                asset_id: editingNote.asset_id || null,
                attachments: editingNote.attachments || [],
                selectedLead: editingNote.leads || null,
                selectedAsset: editingNote.assets || null
            })
        } else {
            setFormData({
                content: '',
                date: new Date().toISOString().split('T')[0],
                lead_id: null,
                asset_id: null,
                attachments: [],
                selectedLead: null,
                selectedAsset: null
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
                asset_id: formData.asset_id,
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
            size="lg"
        >
            <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* Cabeçalho de Configurações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Data"
                        type="date"
                        icon={Calendar}
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                    
                    <AssetAutocomplete
                        tenantId={tenantId}
                        selectedItem={formData.selectedAsset}
                        onSelect={(asset) => setFormData(prev => ({ ...prev, selectedAsset: asset, asset_id: asset.id }))}
                        onClear={() => setFormData(prev => ({ ...prev, selectedAsset: null, asset_id: null }))}
                    />

                    <LeadAutocomplete
                        tenantId={tenantId}
                        selectedItem={formData.selectedLead}
                        onSelect={(lead) => setFormData(prev => ({ ...prev, selectedLead: lead, lead_id: lead.id }))}
                        onClear={() => setFormData(prev => ({ ...prev, selectedLead: null, lead_id: null }))}
                    />
                </div>

                <div className="border-t border-border/60" />

                {/* Área de Escrita */}
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-foreground ml-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-tight">
                        Conteúdo da Nota
                    </label>
                    <FormRichTextarea
                        value={formData.content}
                        onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                        placeholder="Escreva sua nota aqui"
                    />
                </div>

                <div className="border-t border-border/60" />

                {/* Upload de Arquivos */}
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-foreground ml-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-tight">
                        Anexos (PDF, Imagens)
                    </label>
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

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-muted text-foreground border border-border rounded-lg font-bold hover:bg-muted/80 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || !formData.content.trim()}
                        className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Salvando...' : (editingNote ? "Salvar Alterações" : "Criar Nota")}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
