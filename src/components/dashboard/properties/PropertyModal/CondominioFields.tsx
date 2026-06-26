'use client'

import { useState } from 'react'
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox'
import { FormInput } from '@/components/shared/forms/FormInput'
import { Plus, Check, Clock, X, Pencil, Trash2 } from 'lucide-react'
import { addTenantCustomCondo, approveTenantCustomCondo, editTenantCustomCondo, deleteTenantCustomCondo } from '@/app/_actions/tenant'
import type { CustomCondo } from '@/app/_actions/tenant'
import { toast } from 'sonner'

interface CondominioFieldsProps {
    formData: any
    setFormData: (data: any) => void
    tenantId: string
    isAdmin: boolean
    customCondo: CustomCondo[]
    onCustomCondoChange: (condos: CustomCondo[]) => void
}

const DEFAULT_CONDOMINIO = [
    { id: 'home_market', label: 'Home Market' },
    { id: 'portaria_24h', label: 'Portaria 24h' },
    { id: 'portaria_virtual', label: 'Portaria Virtual' },
    { id: 'smart_locker', label: 'Smart Locker' },
    { id: 'vagas_visitantes', label: 'Vagas Visitantes' },
    { id: 'zeladoria', label: 'Zeladoria' }
]

export function CondominioFields({ formData, setFormData, tenantId, isAdmin, customCondo, onCustomCondoChange }: CondominioFieldsProps) {
    const [isAddingNew, setIsAddingNew] = useState(false)
    const [newCondoName, setNewCondoName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [approvingId, setApprovingId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isEditingSaving, setIsEditingSaving] = useState(false)

    const handleEditSave = async (condoId: string) => {
        const trimmed = editingName.trim()
        if (!trimmed) return
        if (trimmed.length < 2) {
            toast.error('O nome deve ter pelo menos 2 caracteres.')
            return
        }

        setIsEditingSaving(true)
        try {
            const result = await editTenantCustomCondo(tenantId, condoId, trimmed)
            if (result.success) {
                onCustomCondoChange(
                    customCondo.map(a =>
                        a.id === condoId ? { ...a, label: trimmed } : a
                    )
                )
                setEditingId(null)
                setEditingName('')
                toast.success('Item editado com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao editar item.')
            }
        } catch {
            toast.error('Erro ao editar item.')
        } finally {
            setIsEditingSaving(false)
        }
    }

    const handleDelete = async (condoId: string, label: string) => {
        if (!confirm(`Tem certeza que deseja excluir o item "${label}" permanentemente?`)) return

        try {
            const result = await deleteTenantCustomCondo(tenantId, condoId)
            if (result.success) {
                onCustomCondoChange(customCondo.filter(a => a.id !== condoId))
                // Desmarca do imóvel se estiver selecionada
                if ((formData.details as any)[condoId]) {
                    const newDetails = { ...formData.details }
                    delete newDetails[condoId]
                    setFormData({
                        ...formData,
                        details: newDetails
                    })
                }
                toast.success('Item excluído com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao excluir item.')
            }
        } catch {
            toast.error('Erro ao excluir item.')
        }
    }

    // Filtra os itens customizados que devem aparecer:
    // - approved: visível para todos
    // - pending: visível apenas para admin
    const visibleCustom = customCondo.filter(
        a => a.status === 'approved' || isAdmin
    )

    const handleAddNew = async () => {
        const trimmed = newCondoName.trim()
        if (!trimmed) return
        if (trimmed.length < 2) {
            toast.error('O nome deve ter pelo menos 2 caracteres.')
            return
        }

        setIsSaving(true)
        try {
            const result = await addTenantCustomCondo(tenantId, trimmed)
            if (result.success && result.data) {
                onCustomCondoChange([...customCondo, result.data])
                // Automaticamente marca como selecionado no imóvel
                setFormData({
                    ...formData,
                    details: { ...formData.details, [result.data.id]: true }
                })
                setNewCondoName('')
                setIsAddingNew(false)
                toast.success('Item adicionado! Aguardando aprovação do administrador.')
            } else {
                toast.error(result.error || 'Erro ao adicionar item.')
            }
        } catch {
            toast.error('Erro ao adicionar item.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleApprove = async (condoId: string) => {
        setApprovingId(condoId)
        try {
            const result = await approveTenantCustomCondo(tenantId, condoId)
            if (result.success) {
                onCustomCondoChange(
                    customCondo.map(a =>
                        a.id === condoId ? { ...a, status: 'approved' } : a
                    )
                )
                toast.success('Item aprovado com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao aprovar item.')
            }
        } catch {
            toast.error('Erro ao aprovar item.')
        } finally {
            setApprovingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                    Condomínio
                </h4>
                {!isAddingNew && (
                    <button
                        type="button"
                        onClick={() => setIsAddingNew(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-secondary-foreground bg-secondary hover:opacity-90 transition-all"
                    >
                        <Plus size={14} />
                        Novo Item
                    </button>
                )}
            </div>

            {/* Input para criar novo item */}
            {isAddingNew && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-card border border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                        type="text"
                        value={newCondoName}
                        onChange={(e) => setNewCondoName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddNew()
                            }
                            if (e.key === 'Escape') {
                                setIsAddingNew(false)
                                setNewCondoName('')
                            }
                        }}
                        placeholder="Nome do novo item..."
                        autoFocus
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-none"
                        disabled={isSaving}
                    />
                    <button
                        type="button"
                        onClick={handleAddNew}
                        disabled={isSaving || !newCondoName.trim()}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsAddingNew(false); setNewCondoName('') }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Lista de itens padrão do condomínio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_CONDOMINIO.map((condo) => (
                    <FormCheckbox
                        key={condo.id}
                        label={condo.label}
                        checked={(formData.details as any)[condo.id]}
                        onChange={(e) => setFormData({
                            ...formData,
                            details: { ...formData.details, [condo.id]: e.target.checked }
                        })}
                    />
                ))}
                
                <div className="flex items-center gap-3">
                    <div className="shrink-0">
                        <FormCheckbox
                            label="Elevadores"
                            checked={formData.details.has_elevadores || false}
                            onChange={(e) => setFormData({
                                ...formData,
                                details: { 
                                    ...formData.details, 
                                    has_elevadores: e.target.checked,
                                    numero_elevadores: e.target.checked ? formData.details.numero_elevadores : ''
                                }
                            })}
                        />
                    </div>
                    {formData.details.has_elevadores && (
                        <div className="flex-1 animate-in fade-in duration-200">
                            <FormInput
                                label=""
                                type="number"
                                value={formData.details.numero_elevadores || ''}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    details: { ...formData.details, numero_elevadores: e.target.value } 
                                })}
                                placeholder="Nº de elevadores"
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <FormInput
                    label="Número de Torres"
                    type="number"
                    value={formData.details.numero_torres || ''}
                    onChange={(e) => setFormData({ 
                        ...formData, 
                        details: { ...formData.details, numero_torres: e.target.value } 
                    })}
                    placeholder="Ex: 3"
                />
                <FormInput
                    label="Aptos / Torre"
                    type="number"
                    value={formData.details.aptos_por_torre || ''}
                    onChange={(e) => setFormData({ 
                        ...formData, 
                        details: { ...formData.details, aptos_por_torre: e.target.value } 
                    })}
                    placeholder="Ex: 4"
                />
            </div>

            {/* Lista de itens customizados */}
            {visibleCustom.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                        Itens personalizados
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {visibleCustom.map((condo) => (
                            <div key={condo.id} className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-muted/10 transition-all min-h-[36px]">
                                {editingId === condo.id ? (
                                    <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleEditSave(condo.id)
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
                                            onClick={() => handleEditSave(condo.id)}
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
                                                label={condo.label}
                                                checked={(formData.details as any)[condo.id] || false}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    details: { ...formData.details, [condo.id]: e.target.checked }
                                                })}
                                            />
                                            {condo.status === 'pending' && isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(condo.id)}
                                                    disabled={approvingId === condo.id}
                                                    title="Aprovar este item"
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                                                >
                                                    <Clock size={11} />
                                                    {approvingId === condo.id ? '...' : 'Aprovar'}
                                                </button>
                                            )}
                                            {condo.status === 'pending' && !isAdmin && (
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
                                                        setEditingId(condo.id)
                                                        setEditingName(condo.label)
                                                    }}
                                                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                                                    title="Editar"
                                                >
                                                    <Pencil size={12} className="text-accent-icon" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(condo.id, condo.label)}
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
