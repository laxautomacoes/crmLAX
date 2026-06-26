'use client'

import { useState } from 'react'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { Plus, Check, Clock, X, Pencil, Trash2 } from 'lucide-react'
import { addTenantCustomFeature, approveTenantCustomFeature, editTenantCustomFeature, deleteTenantCustomFeature } from '@/app/_actions/tenant'
import type { CustomFeature } from '@/app/_actions/tenant'
import { toast } from 'sonner'

interface FeaturesFieldsProps {
    formData: any
    setFormData: (data: any) => void
    tenantId: string
    isAdmin: boolean
    customFeatures: CustomFeature[]
    onCustomFeaturesChange: (features: CustomFeature[]) => void
}

export function FeaturesFields({ formData, setFormData, tenantId, isAdmin, customFeatures, onCustomFeaturesChange }: FeaturesFieldsProps) {
    const [isAddingNew, setIsAddingNew] = useState(false)
    const [newFeatureName, setNewFeatureName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [approvingId, setApprovingId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isEditingSaving, setIsEditingSaving] = useState(false)

    const handleEditSave = async (featureId: string) => {
        const trimmed = editingName.trim()
        if (!trimmed) return
        if (trimmed.length < 2) {
            toast.error('O nome deve ter pelo menos 2 caracteres.')
            return
        }

        setIsEditingSaving(true)
        try {
            const result = await editTenantCustomFeature(tenantId, featureId, trimmed)
            if (result.success) {
                onCustomFeaturesChange(
                    customFeatures.map(f =>
                        f.id === featureId ? { ...f, label: trimmed } : f
                    )
                )
                setEditingId(null)
                setEditingName('')
                toast.success('Característica editada com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao editar característica.')
            }
        } catch {
            toast.error('Erro ao editar característica.')
        } finally {
            setIsEditingSaving(false)
        }
    }

    const handleDelete = async (featureId: string, label: string) => {
        if (!confirm(`Tem certeza que deseja excluir a característica "${label}" permanentemente?`)) return

        try {
            const result = await deleteTenantCustomFeature(tenantId, featureId)
            if (result.success) {
                onCustomFeaturesChange(customFeatures.filter(f => f.id !== featureId))
                if ((formData.details as any)[featureId]) {
                    const newDetails = { ...formData.details }
                    delete newDetails[featureId]
                    setFormData({
                        ...formData,
                        details: newDetails
                    })
                }
                toast.success('Característica excluída com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao excluir característica.')
            }
        } catch {
            toast.error('Erro ao excluir característica.')
        }
    }

    const visibleCustom = customFeatures.filter(
        f => f.status === 'approved' || isAdmin
    )

    const handleAddNew = async () => {
        const trimmed = newFeatureName.trim()
        if (!trimmed) return
        if (trimmed.length < 2) {
            toast.error('O nome deve ter pelo menos 2 caracteres.')
            return
        }

        setIsSaving(true)
        try {
            const result = await addTenantCustomFeature(tenantId, trimmed)
            if (result.success && result.data) {
                onCustomFeaturesChange([...customFeatures, result.data])
                setFormData({
                    ...formData,
                    details: { ...formData.details, [result.data.id]: true }
                })
                setNewFeatureName('')
                setIsAddingNew(false)
                toast.success('Característica adicionada! Aguardando aprovação do administrador.')
            } else {
                toast.error(result.error || 'Erro ao adicionar característica.')
            }
        } catch {
            toast.error('Erro ao adicionar característica.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleApprove = async (featureId: string) => {
        setApprovingId(featureId)
        try {
            const result = await approveTenantCustomFeature(tenantId, featureId)
            if (result.success) {
                onCustomFeaturesChange(
                    customFeatures.map(f =>
                        f.id === featureId ? { ...f, status: 'approved' } : f
                    )
                )
                toast.success('Característica aprovada com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao aprovar característica.')
            }
        } catch {
            toast.error('Erro ao aprovar característica.')
        } finally {
            setApprovingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                    Características Adicionais
                </h4>
                {!isAddingNew && (
                    <button
                        type="button"
                        onClick={() => setIsAddingNew(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-secondary-foreground bg-secondary hover:opacity-90 transition-all"
                    >
                        <Plus size={14} />
                        Nova Característica
                    </button>
                )}
            </div>

            {isAddingNew && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-card border border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                        type="text"
                        value={newFeatureName}
                        onChange={(e) => setNewFeatureName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddNew()
                            }
                            if (e.key === 'Escape') {
                                setIsAddingNew(false)
                                setNewFeatureName('')
                            }
                        }}
                        placeholder="Nome da nova característica..."
                        autoFocus
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-none"
                        disabled={isSaving}
                    />
                    <button
                        type="button"
                        onClick={handleAddNew}
                        disabled={isSaving || !newFeatureName.trim()}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsAddingNew(false); setNewFeatureName('') }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FormCheckbox
                    label="Vista livre"
                    checked={formData.details.has_vista_livre || false}
                    onChange={(e) => setFormData({
                        ...formData,
                        details: { ...formData.details, has_vista_livre: e.target.checked }
                    })}
                />
            </div>

            <div className="w-full sm:w-1/3 pt-2">
                <FormSelect
                    label="Face Solar"
                    value={formData.details.face_solar || ''}
                    onChange={(e) => setFormData({
                        ...formData,
                        details: { ...formData.details, face_solar: e.target.value }
                    })}
                    options={[
                        { value: '', label: 'Não informado' },
                        { value: 'Norte', label: 'Norte' },
                        { value: 'Sul', label: 'Sul' },
                        { value: 'Leste', label: 'Leste' },
                        { value: 'Oeste', label: 'Oeste' },
                        { value: 'Noroeste', label: 'Noroeste' },
                        { value: 'Nordeste', label: 'Nordeste' },
                        { value: 'Sudoeste', label: 'Sudoeste' },
                        { value: 'Sudeste', label: 'Sudeste' }
                    ]}
                />
            </div>

            {visibleCustom.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                        Características Personalizadas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {visibleCustom.map((feature) => (
                            <div key={feature.id} className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-muted/10 transition-all min-h-[36px]">
                                {editingId === feature.id ? (
                                    <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleEditSave(feature.id)
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
                                            onClick={() => handleEditSave(feature.id)}
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
                                                label={feature.label}
                                                checked={(formData.details as any)[feature.id] || false}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    details: { ...formData.details, [feature.id]: e.target.checked }
                                                })}
                                            />
                                            {feature.status === 'pending' && isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(feature.id)}
                                                    disabled={approvingId === feature.id}
                                                    title="Aprovar esta característica"
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                                                >
                                                    <Clock size={11} />
                                                    {approvingId === feature.id ? '...' : 'Aprovar'}
                                                </button>
                                            )}
                                            {feature.status === 'pending' && !isAdmin && (
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
                                                        setEditingId(feature.id)
                                                        setEditingName(feature.label)
                                                    }}
                                                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                                                    title="Editar"
                                                >
                                                    <Pencil size={12} className="text-accent-icon" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(feature.id, feature.label)}
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
