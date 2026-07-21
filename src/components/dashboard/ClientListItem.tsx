'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, Mail, MessageCircle, Edit, Trash2, Archive, MoreVertical, User } from 'lucide-react'
import { formatPhone } from '@/lib/utils/phone'
import { LeadTemperatureBadge } from '@/components/dashboard/leads/LeadTemperatureBadge'

interface ClientListItemProps {
    client: any
    onClickClient: () => void
    onEdit: () => void
    onDelete: () => void
    onArchive: () => void
    tenantId: string
    profileId: string
}

export function ClientListItem({
    client,
    onClickClient,
    onEdit,
    onDelete,
    onArchive,
    tenantId,
    profileId
}: ClientListItemProps) {
    return (
        <tr className="hover:bg-muted/50 transition-colors cursor-pointer group" onClick={onClickClient}>
            <td className="px-4 py-5 text-left">
                <div className="flex items-center justify-start gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground flex-shrink-0 border border-border/10">
                        {client.avatar_url ? (
                            <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                            <User size={16} />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{client.name}</span>
                        {client.leads?.some((l: any) => l.partner_id) && (
                            <span 
                                className="w-5 h-5 min-w-[20px] min-h-[20px] shrink-0 aspect-square flex items-center justify-center bg-blue-600 text-white dark:bg-blue-600 dark:text-white rounded-full text-[10px] font-bold leading-none shadow-sm"
                                title={(() => {
                                    const lead = client.leads?.find((l: any) => l.partner_id && l.partners);
                                    if (!lead) return "Cliente de Parceria";
                                    const name = Array.isArray(lead.partners) ? lead.partners[0]?.name : lead.partners?.name;
                                    return name ? `Parceria - ${name}` : "Cliente de Parceria";
                                })()}
                            >
                                P
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-5">
                <div className="flex flex-col items-center justify-center gap-1 text-sm whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                        <span className="text-foreground font-medium">{formatPhone(client.phone || '')}</span>
                        {client.phone && (
                        <a
                            href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-full hover:bg-emerald-500/20 transition-colors"
                            title="Abrir no WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MessageCircle size={14} />
                        </a>
                        )}
                    </div>
                    {client.email && (
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-sm font-medium text-foreground max-w-[180px] truncate">{client.email}</span>
                            <a
                                href={`mailto:${client.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-colors"
                                title="Enviar e-mail"
                            >
                                <Mail size={14} />
                            </a>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-5 hidden lg:table-cell text-center">
                <div className="flex flex-col gap-0.5 items-center">
                    {client.leads && client.leads.length > 0 ? (
                        client.leads.map((lead: any, i: number) => (
                            <div key={i} className="flex items-center justify-center gap-1.5 mb-1 last:mb-0">
                                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                    {lead.property_interest || lead.properties?.title || lead.source || 'Sem interesse'}
                                </span>
                                {lead.proposals && lead.proposals.length > 0 && (
                                    <span 
                                        className="w-5 h-5 min-w-[20px] min-h-[20px] shrink-0 aspect-square flex items-center justify-center rounded-full text-[10px] font-black leading-none"
                                        style={{ backgroundColor: '#FFE600', color: '#1a1a1a' }}
                                        title="Possui proposta"
                                    >
                                        P
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <span className="text-sm text-muted-foreground">Sem leads</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-5 hidden lg:table-cell text-center">
                <div className="flex flex-col gap-1 items-center">
                    {client.leads && client.leads.length > 0 ? (
                        client.leads.map((lead: any, i: number) => {
                            const c = lead.status_color
                            const isLight = c && ['#FFFFFF', '#FACC15', '#FDE047', '#FEF08A', '#FCD34D'].includes(c.toUpperCase())
                            return (
                                <span
                                    key={i}
                                    className="px-2.5 py-0.5 text-[10px] font-medium rounded-full uppercase whitespace-nowrap"
                                    style={c ? {
                                        backgroundColor: c,
                                        color: isLight ? '#1a1a1a' : '#ffffff',
                                    } : {
                                        backgroundColor: 'var(--secondary)',
                                        color: 'var(--foreground)',
                                        opacity: 0.6
                                    }}
                                >
                                    {lead.status_name || lead.status || '—'}
                                </span>
                            )
                        })
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-5 hidden lg:table-cell text-center">
                <span className="text-sm text-muted-foreground font-medium">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : '—'}
                </span>
            </td>
            <td className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <ClientActionsDropdown
                        client={client}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onArchive={onArchive}
                    />
                </div>
            </td>

        </tr>
    )
}

function ClientActionsDropdown({ client, onEdit, onDelete, onArchive }: { client: any; onEdit: () => void; onDelete: () => void; onArchive: () => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o) }}
                className="p-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors shadow-sm"
                title="Ações"
            >
                <MoreVertical size={16} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <Edit size={14} className="text-blue-500" />
                        Editar
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onArchive() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-amber-500/10 transition-colors"
                    >
                        <Archive size={14} className="text-amber-500" />
                        {client.is_archived ? 'Desarquivar' : 'Arquivar'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 size={14} className="text-red-500" />
                        Excluir
                    </button>
                </div>
            )}
        </div>
    )
}
