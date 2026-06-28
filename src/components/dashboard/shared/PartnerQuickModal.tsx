'use client'

import { useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { createPartner } from '@/app/_actions/partners'

interface PartnerQuickModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (partner: any) => void
    tenantId: string
}

export function PartnerQuickModal({ isOpen, onClose, onSuccess, tenantId }: PartnerQuickModalProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [company, setCompany] = useState('')
    const [creci, setCreci] = useState('')
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            setError('O nome do parceiro é obrigatório')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await createPartner(tenantId, {
                name: name.trim(),
                phone: phone.trim() || null,
                email: email.trim() || null,
                company: company.trim() || null,
                creci: creci.trim() || null
            })

            if (!res.success) {
                throw new Error(res.error || 'Erro ao criar parceiro')
            }

            onSuccess(res.data)
            
            // Resetar formulário
            setName('')
            setPhone('')
            setEmail('')
            setCompany('')
            setCreci('')
            onClose()
        } catch (err: any) {
            setError(err.message || 'Falha ao salvar parceiro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Parceiro Comercial"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                        {error}
                    </div>
                )}

                <FormInput
                    label="Nome do Corretor / Parceiro *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    required
                    disabled={loading}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="WhatsApp / Telefone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        disabled={loading}
                    />

                    <FormInput
                        label="E-mail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: joao@parceiro.com"
                        disabled={loading}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Imobiliária / Empresa"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ex: Imobiliária Alfa"
                        disabled={loading}
                    />

                    <FormInput
                        label="CRECI (Opcional)"
                        value={creci}
                        onChange={(e) => setCreci(e.target.value)}
                        placeholder="Ex: 12345-F"
                        disabled={loading}
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border border-border text-[#404F4F] rounded-lg font-bold hover:bg-[#404F4F]/5 transition-all active:scale-[0.99]"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:bg-[#F2DB00] shadow-sm transform active:scale-[0.99] transition-all"
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Parceiro'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
