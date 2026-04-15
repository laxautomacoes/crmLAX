'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { createTenant } from '@/app/_actions/tenant'
import { toast } from 'sonner'
import { Building2, Link as LinkIcon } from 'lucide-react'

interface CreateTenantModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function CreateTenantModal({ isOpen, onClose, onSuccess }: CreateTenantModalProps) {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [plan, setPlan] = useState('freemium')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Gerar slug automaticamente a partir do nome
    useEffect(() => {
        if (name) {
            const generatedSlug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/--+/g, '-')
                .trim()
            setSlug(generatedSlug)
        }
    }, [name])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !slug) return

        setIsSubmitting(true)
        try {
            const result = await createTenant({
                name,
                slug,
                plan_type: plan
            })

            if (result.success) {
                toast.success('Empresa criada com sucesso!')
                setName('')
                setSlug('')
                setPlan('freemium')
                onSuccess?.()
                onClose()
            } else {
                toast.error(result.error || 'Erro ao criar empresa')
            }
        } catch (error) {
            toast.error('Ocorreu um erro inesperado')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cadastrar Nova Empresa"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <FormInput 
                    label="Nome da Empresa"
                    placeholder="Ex: Imobiliária Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={Building2}
                    required
                />

                <FormInput 
                    label="Slug da URL"
                    placeholder="ex-imobiliaria-silva"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    icon={LinkIcon}
                    required
                    className="lowercase"
                />

                <div className="w-full">
                    <label className="block text-sm font-bold text-foreground/80 ml-1 mb-1">
                        Plano de Assinatura
                    </label>
                    <select
                        className="w-full rounded-lg border border-muted-foreground/30 bg-card text-foreground text-sm outline-none transition-all focus:ring-2 focus:ring-secondary/50 focus:border-secondary py-2 px-4 appearance-none"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        required
                    >
                        <option value="freemium">Freemium</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !name || !slug}
                        className="px-6 py-2 bg-[#FFE600] text-[#404F4F] rounded-lg text-sm font-bold hover:bg-[#F2DB00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
                    >
                        {isSubmitting ? 'Cadastrando...' : 'Cadastrar Empresa'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
