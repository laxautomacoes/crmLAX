'use client'

import { useState } from 'react'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { FormInput } from '@/components/shared/forms/FormInput'
import { Plus, Check, Clock, X, Pencil, Trash2 } from 'lucide-react'
import { addTenantCustomAmenity, approveTenantCustomAmenity, editTenantCustomAmenity, deleteTenantCustomAmenity } from '@/app/_actions/tenant'
import type { CustomAmenity } from '@/app/_actions/tenant'
import { toast } from 'sonner'

interface AmenitiesFieldsProps {
    formData: any
    setFormData: (data: any) => void
    tenantId: string
    isAdmin: boolean
    customAmenities: CustomAmenity[]
    onCustomAmenitiesChange: (amenities: CustomAmenity[]) => void
}

const DEFAULT_AMENITIES = [
    { id: 'academia', label: 'Academia' },
    { id: 'brinquedoteca', label: 'Brinquedoteca' },
    { id: 'espaco_gourmet', label: 'Espaço Gourmet' },
    { id: 'sala_estudos_coworking', label: 'Estudos/Coworking' },
    { id: 'piscina', label: 'Piscina' },
    { id: 'piscina_aquecida', label: 'Piscina Aquecida' },
    { id: 'playground', label: 'Playground' },
    { id: 'sala_cinema', label: 'Sala de Cinema' },
    { id: 'sala_jogos', label: 'Sala de Jogos' },
    { id: 'salao_festas', label: 'Salão de Festas' }
]

export function AmenitiesFields({ formData, setFormData, tenantId, isAdmin, customAmenities, onCustomAmenitiesChange }: AmenitiesFieldsProps) {
    const [isAddingNew, setIsAddingNew] = useState(false)
    const [newAreaName, setNewAreaName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [approvingId, setApprovingId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isEditingSaving, setIsEditingSaving] = useState(false)

    const handleEditSave = async (amenityId: string) => {
        const trimmed = editingName.trim()
        if (!trimmed) return
        if (trimmed.length < 2) {
            toast.error('O nome deve ter pelo menos 2 caracteres.')
            return
        }

        setIsEditingSaving(true)
        try {
            const result = await editTenantCustomAmenity(tenantId, amenityId, trimmed)
            if (result.success) {
                onCustomAmenitiesChange(
                    customAmenities.map(a =>
                        a.id === amenityId ? { ...a, label: trimmed } : a
                    )
                )
                setEditingId(null)
                setEditingName('')
                toast.success('Área editada com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao editar área.')
            }
        } catch {
            toast.error('Erro ao editar área.')
        } finally {
            setIsEditingSaving(false)
        }
    }

    const handleDelete = async (amenityId: string, label: string) => {
        if (!confirm(`Tem certeza que deseja excluir a área "${label}" permanentemente?`)) return

        try {
            const result = await deleteTenantCustomAmenity(tenantId, amenityId)
            if (result.success) {
                onCustomAmenitiesChange(customAmenities.filter(a => a.id !== amenityId))
                // Desmarca do imóvel se estiver selecionada
                if ((formData.details as any)[amenityId]) {
                    const newDetails = { ...formData.details }
                    delete newDetails[amenityId]
                    setFormData({
                        ...formData,
                        details: newDetails
                    })
                }
                toast.success('Área excluída com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao excluir área.')
            }
        } catch {
            toast.error('Erro ao excluir área.')
        }
    }

    // Filtra as áreas customizadas que devem aparecer:
    // - approved: visível para todos
    // - pending: visível apenas para admin
    const visibleCustom = customAmenities.filter(
        a => a.status === 'approved' || isAdmin
    )

    const handleAddNew = async () => {
        const trimmed = newAreaName.trim()
        if (!trimmed) return
        if (trimmed.length < 2) {
            toast.error('O nome deve ter pelo menos 2 caracteres.')
            return
        }

        setIsSaving(true)
        try {
            const result = await addTenantCustomAmenity(tenantId, trimmed)
            if (result.success && result.data) {
                onCustomAmenitiesChange([...customAmenities, result.data])
                // Automaticamente marca como selecionado no imóvel
                setFormData({
                    ...formData,
                    details: { ...formData.details, [result.data.id]: true }
                })
                setNewAreaName('')
                setIsAddingNew(false)
                toast.success('Área adicionada! Aguardando aprovação do administrador.')
            } else {
                toast.error(result.error || 'Erro ao adicionar área.')
            }
        } catch {
            toast.error('Erro ao adicionar área.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleApprove = async (amenityId: string) => {
        setApprovingId(amenityId)
        try {
            const result = await approveTenantCustomAmenity(tenantId, amenityId)
            if (result.success) {
                onCustomAmenitiesChange(
                    customAmenities.map(a =>
                        a.id === amenityId ? { ...a, status: 'approved' } : a
                    )
                )
                toast.success('Área aprovada com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao aprovar área.')
            }
        } catch {
            toast.error('Erro ao aprovar área.')
        } finally {
            setApprovingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                    Área comum | lazer
                </h4>
                {!isAddingNew && (
                    <button
                        type="button"
                        onClick={() => setIsAddingNew(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-secondary-foreground bg-secondary hover:opacity-90 transition-all"
                    >
                        <Plus size={14} />
                        Nova Área
                    </button>
                )}
            </div>

            {isAddingNew && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-card border border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                        type="text"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddNew()
                            }
                            if (e.key === 'Escape') {
                                setIsAddingNew(false)
                                setNewAreaName('')
                            }
                        }}
                        placeholder="Nome da nova área..."
                        autoFocus
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-none"
                        disabled={isSaving}
                    />
                    <button
                        type="button"
                        onClick={handleAddNew}
                        disabled={isSaving || !newAreaName.trim()}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsAddingNew(false); setNewAreaName('') }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Lista de amenidades padrão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_AMENITIES.map((amenity) => (
                    <FormCheckbox
                        key={amenity.id}
                        label={amenity.label}
                        checked={(formData.details as any)[amenity.id]}
                        onChange={(e) => setFormData({
                            ...formData,
                            details: { ...formData.details, [amenity.id]: e.target.checked }
                        })}
                    />
                ))}
            </div>

            {/* Lista de amenidades customizadas */}
            {visibleCustom.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                        Áreas personalizadas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {visibleCustom.map((amenity) => (
                            <div key={amenity.id} className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-muted/10 transition-all min-h-[36px]">
                                {editingId === amenity.id ? (
                                    <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleEditSave(amenity.id)
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingId(null)
                                                    setEditingName('')
                                                }
                                            }}
                                            className="flex-1 bg-transparent text-xs text-foreground outline-none border-b border-border/80 focus:border-accent-icon py-0.5"
                                            autoFocus
                                            disabled={isEditingSaving}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleEditSave(amenity.id)}
                                            disabled={isEditingSaving || !editingName.trim()}
                                            className="text-emerald-500 hover:text-emerald-400 p-1 disabled:opacity-50"
                                            title="Salvar alteração"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(null); setEditingName('') }}
                                            disabled={isEditingSaving}
                                            className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-50"
                                            title="Cancelar"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <FormCheckbox
                                                label={amenity.label}
                                                checked={(formData.details as any)[amenity.id] || false}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    details: { ...formData.details, [amenity.id]: e.target.checked }
                                                })}
                                            />
                                            {amenity.status === 'pending' && isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(amenity.id)}
                                                    disabled={approvingId === amenity.id}
                                                    title="Aprovar esta área"
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                                                >
                                                    <Clock size={11} />
                                                    {approvingId === amenity.id ? '...' : 'Aprovar'}
                                                </button>
                                            )}
                                            {amenity.status === 'pending' && !isAdmin && (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground bg-muted/50">
                                                    <Clock size={11} />
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(amenity.id)
                                                        setEditingName(amenity.label)
                                                    }}
                                                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                                                    title="Editar"
                                                >
                                                    <Pencil size={12} className="text-accent-icon" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(amenity.id, amenity.label)}
                                                    className="text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-muted"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={12} className="text-red-500/80" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
