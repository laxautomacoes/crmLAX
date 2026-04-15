'use client'

import React, { useState } from 'react'
import { updateTenant, deleteTenant } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { Globe, Users, ChevronDown, ChevronUp, Plus } from 'lucide-react'

interface Tenant {
    id: string
    name: string
    slug: string
    plan_type: string
    custom_domain: string | null
    status: 'active' | 'suspended'
    api_key: string
    branding: any
    created_at: string
    profiles: { count: number }[]
}

export default function TenantsList({ initialTenants, search, onRefresh }: { initialTenants: Tenant[], search: string, onRefresh: () => void }) {
    const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null)
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Estados para o formulário de edição
    const [editName, setEditName] = useState('')
    const [editSlug, setEditSlug] = useState('')
    const [editPlan, setEditPlan] = useState('')
    const [editDomain, setEditDomain] = useState('')

    const filteredTenants = initialTenants.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.slug.toLowerCase().includes(search.toLowerCase())
    )

    const handleToggleExpand = (tenant: Tenant) => {
        if (expandedTenantId === tenant.id) {
            setExpandedTenantId(null)
        } else {
            setExpandedTenantId(tenant.id)
            setEditName(tenant.name)
            setEditSlug(tenant.slug)
            setEditPlan(tenant.plan_type || 'freemium')
            setEditDomain(tenant.custom_domain || '')
        }
    }

    const handleUpdate = async (tenantId: string) => {
        setIsSubmitting(true)
        try {
            const result = await updateTenant(tenantId, {
                name: editName,
                slug: editSlug,
                plan_type: editPlan,
                custom_domain: editDomain || undefined
            })

            if (result.success) {
                toast.success('Empresa atualizada com sucesso!')
                onRefresh()
                setExpandedTenantId(null)
            } else {
                toast.error(result.error || 'Erro ao atualizar empresa')
            }
        } catch (error) {
            toast.error('Erro ao conectar com o servidor')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleStatus = async (tenant: Tenant) => {
        setIsSubmitting(true)
        try {
            const newStatus = tenant.status === 'active' ? 'suspended' : 'active'
            const result = await updateTenant(tenant.id, { status: newStatus })

            if (result.success) {
                toast.success(`Empresa ${newStatus === 'active' ? 'ativada' : 'bloqueada'} com sucesso!`)
                onRefresh()
                setExpandedTenantId(null)
            } else {
                toast.error(result.error || 'Erro ao alterar status')
            }
        } catch (error) {
            toast.error('Erro ao conectar com o servidor')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!isDeletingId) return
        
        setIsSubmitting(true)
        try {
            const result = await deleteTenant(isDeletingId)
            if (result.success) {
                toast.success('Empresa excluída permanentemente!')
                onRefresh()
                setIsDeletingId(null)
            } else {
                toast.error(result.error || 'Erro ao excluir empresa')
            }
        } catch (error) {
            toast.error('Erro ao conectar com o servidor')
        } finally {
            setIsSubmitting(false)
            setIsDeletingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider align-middle">Empresa</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider align-middle text-center">Plano</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider align-middle text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider align-middle text-center">Domínio</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider align-middle text-center">Usuários</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider align-middle text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTenants.map((tenant) => (
                                <React.Fragment key={tenant.id}>
                                    <tr 
                                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${expandedTenantId === tenant.id ? 'bg-muted/40' : ''}`}
                                        onClick={() => handleToggleExpand(tenant)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                                                    tenant.status === 'suspended' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                                }`}>
                                                    {tenant.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm flex items-center gap-2">
                                                        {tenant.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">/{tenant.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    tenant.plan_type === 'pro' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                    tenant.plan_type === 'starter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                                }`}>
                                                    {tenant.plan_type || 'freemium'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">Desde: {new Date(tenant.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                tenant.status === 'suspended' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            }`}>
                                                {tenant.status === 'suspended' ? 'Bloqueada' : 'Ativa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted-foreground align-middle">
                                            <div className="flex items-center gap-1.5">
                                                <Globe className="w-3 h-3" />
                                                {tenant.custom_domain || `${tenant.slug}.laxperience.online`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted-foreground align-middle">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3 h-3" />
                                                {tenant.profiles?.[0]?.count || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <div className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground group-hover:text-foreground transition-all">
                                                {expandedTenantId === tenant.id ? (
                                                    <ChevronUp className="w-4 h-4 text-primary" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* DETALHES EXPANDIDOS */}
                                    {expandedTenantId === tenant.id && (
                                        <tr className="bg-muted/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <td colSpan={6} className="px-8 py-6 border-b border-border shadow-inner">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                    {/* Lado Esquerdo: Edição */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                                                            <Plus className="w-4 h-4 text-primary" />
                                                            Configurações da Empresa
                                                        </h4>
                                                        
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-bold text-muted-foreground ml-1">Nome</label>
                                                                <input 
                                                                    type="text"
                                                                    className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-bold text-muted-foreground ml-1">Slug</label>
                                                                <input 
                                                                    type="text"
                                                                    className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none lowercase"
                                                                    value={editSlug}
                                                                    onChange={(e) => setEditSlug(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-bold text-muted-foreground ml-1">Plano</label>
                                                                <select
                                                                    className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                                                    value={editPlan}
                                                                    onChange={(e) => setEditPlan(e.target.value)}
                                                                >
                                                                    <option value="freemium">Freemium</option>
                                                                    <option value="starter">Starter</option>
                                                                    <option value="pro">Pro</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-bold text-muted-foreground ml-1">Domínio Customizado</label>
                                                                <input 
                                                                    type="text"
                                                                    className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                                                    placeholder="exemplo.com.br"
                                                                    value={editDomain}
                                                                    onChange={(e) => setEditDomain(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 flex gap-3">
                                                            <button
                                                                onClick={() => handleUpdate(tenant.id)}
                                                                disabled={isSubmitting}
                                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                                                            >
                                                                Salvar Alterações
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(tenant)}
                                                                disabled={isSubmitting}
                                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                                                                    tenant.status === 'suspended' 
                                                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                                                }`}
                                                            >
                                                                {tenant.status === 'suspended' ? 'Ativar Empresa' : 'Bloquear Empresa'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Lado Direito: Mais Informações e Ações Críticas */}
                                                    <div className="space-y-6">
                                                        <div className="bg-background/50 border border-border p-4 rounded-xl space-y-3">
                                                            <h5 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Informações de Sistema</h5>
                                                            <div className="space-y-2">
                                                                <div className="text-xs">
                                                                    <span className="font-semibold text-muted-foreground">ID:</span>
                                                                    <code className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">{tenant.id}</code>
                                                                </div>
                                                                <div className="text-xs">
                                                                    <span className="font-semibold text-muted-foreground">API Key:</span>
                                                                    <code className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded break-all">{tenant.api_key}</code>
                                                                </div>
                                                                <div className="text-xs">
                                                                    <span className="font-semibold text-muted-foreground">Criado em:</span>
                                                                    <span className="ml-2 text-muted-foreground">{new Date(tenant.created_at).toLocaleString('pt-BR')}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2">
                                                            <h5 className="text-[10px] uppercase font-bold text-destructive tracking-widest">Zona de Perigo</h5>
                                                            <button
                                                                onClick={() => setIsDeletingId(tenant.id)}
                                                                className="w-fit flex items-center gap-2 px-4 py-2 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                                            >
                                                                Excluir Empresa Permanentemente
                                                            </button>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                A exclusão removerá todos os dados, usuários e leads vinculados a esta empresa. Esta ação é irreversível.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Confirmação de Exclusão */}
            <Modal
                isOpen={!!isDeletingId}
                onClose={() => setIsDeletingId(null)}
                title="Excluir Empresa"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                        <p className="text-sm font-bold flex items-center gap-2">
                            ⚠️ Ação Crítica
                        </p>
                        <p className="text-xs mt-1">
                            Você está prestes a excluir permanentemente esta empresa. Isso apagará todos os leads, contatos e configurações sem possibilidade de recuperação.
                        </p>
                    </div>
                    
                    <p className="text-sm text-foreground/80">
                        Para confirmar, clique no botão abaixo. Esta ação não pode ser desfeita.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeletingId(null)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-destructive text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-sm active:scale-[0.95] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Excluindo...' : 'Sim, Excluir Empresa'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
