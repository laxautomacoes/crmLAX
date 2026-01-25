'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { Search, Mail, MessageCircle, Send, Loader2, User, CheckCircle2 } from 'lucide-react'
import { getPipelineData } from '@/app/_actions/leads'
import { sendPropertyEmail, logInteraction } from '@/app/_actions/messaging'
import { getProfile } from '@/app/_actions/profile'
import { toast } from 'sonner'
import { formatPhone } from '@/lib/utils/phone'

interface SendToLeadModalProps {
    isOpen: boolean
    onClose: () => void
    property: any
    tenantId: string
    tenantSlug: string
}

export function SendToLeadModal({ isOpen, onClose, property, tenantId, tenantSlug }: SendToLeadModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [leads, setLeads] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState<any>(null)
    const [sending, setSending] = useState(false)
    const [currentBroker, setCurrentBroker] = useState<any>(null)

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            fetchCurrentBroker()
        }
    }, [isOpen])

    const fetchCurrentBroker = async () => {
        const { profile } = await getProfile()
        if (profile) {
            setCurrentBroker(profile)
        }
    }

    const fetchLeads = async () => {
        setIsLoading(true)
        const result = await getPipelineData(tenantId)
        if (result.success && result.data) {
            setLeads(result.data.leads)
        }
        setIsLoading(false)
    }

    const filteredLeads = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm)
    )

    const handleSendEmail = async () => {
        if (!selectedLead || !selectedLead.email) {
            toast.error('Selecione um lead com e-mail válido')
            return
        }

        setSending(true)
        const result = await sendPropertyEmail(selectedLead.id, selectedLead.email, property)
        
        if (result.success) {
            toast.success('E-mail enviado com sucesso!')
            onClose()
        } else {
            toast.error('Erro ao enviar e-mail: ' + result.error)
        }
        setSending(false)
    }

    const handleSendWhatsApp = async () => {
        if (!selectedLead || !selectedLead.phone) {
            toast.error('Selecione um lead com WhatsApp válido')
            return
        }

        const cleanPhone = selectedLead.phone.replace(/\D/g, '')
        const propertyUrl = `https://${tenantSlug}.laxperience.online/site/${tenantSlug}/property/${property.id}${currentBroker ? `?b=${currentBroker.id}` : ''}`
        
        const message = `Olá ${selectedLead.name}! Tudo bem?\n\nEstou te enviando os detalhes deste imóvel que pode te interessar:\n\n*${property.title}*\n💰 Valor: R$ ${new Intl.NumberFormat('pt-BR').format(property.price)}\n📍 ${property.details?.endereco?.bairro || ''} - ${property.details?.endereco?.cidade || ''}\n\nConfira todas as fotos e detalhes aqui: ${propertyUrl}\n\nQualquer dúvida estou à disposição!`
        
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
        
        window.open(whatsappUrl, '_blank')
        
        // Log interaction
        await logInteraction(selectedLead.id, 'whatsapp', `Enviado link do imóvel via WhatsApp: ${property.title}`)
        
        toast.success('WhatsApp aberto!')
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Enviar para Lead"
            size="md"
        >
            <div className="space-y-6">
                {!selectedLead ? (
                    <div className="space-y-4">
                        <FormInput
                            placeholder="Buscar lead por nome, email ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={Search}
                        />

                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-secondary" size={24} />
                                </div>
                            ) : filteredLeads.length > 0 ? (
                                filteredLeads.map(lead => (
                                    <button
                                        key={lead.id}
                                        onClick={() => setSelectedLead(lead)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-secondary/10 group-hover:text-secondary transition-colors">
                                            <User size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground truncate">{lead.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{lead.email || 'Sem e-mail'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-muted-foreground">{formatPhone(lead.phone)}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center py-8 text-muted-foreground">Nenhum lead encontrado.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/5 border border-secondary/20">
                            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                <User size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Lead Selecionado</p>
                                <p className="text-lg font-bold text-foreground">{selectedLead.name}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedLead(null)}
                                className="text-sm font-bold text-secondary hover:underline"
                            >
                                Alterar
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleSendEmail}
                                disabled={sending || !selectedLead.email}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <Mail size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-foreground">Enviar E-mail</p>
                                    <p className="text-xs text-muted-foreground">{selectedLead.email || 'Sem e-mail'}</p>
                                </div>
                            </button>

                            <button
                                onClick={handleSendWhatsApp}
                                disabled={sending || !selectedLead.phone}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                    <MessageCircle size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-foreground">Enviar WhatsApp</p>
                                    <p className="text-xs text-muted-foreground">{formatPhone(selectedLead.phone)}</p>
                                </div>
                            </button>
                        </div>

                        {sending && (
                            <div className="flex items-center justify-center gap-2 text-secondary font-bold">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Enviando...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
