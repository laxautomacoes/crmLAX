'use client'

import { useState, useRef, useEffect } from 'react'
import { Home, MapPin, BedDouble, Bath, Car, Trash2, Edit, Shield, Waves, Utensils, PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, FileText, Video, Send, Maximize2, MoreVertical, Archive, Globe, XCircle, AlertTriangle } from 'lucide-react'
import { translatePropertyType, getStatusStyles, getSituacaoStyles, translateStatus } from '@/utils/property-translations'

interface PropertyListItemProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    onApprove?: (id: string) => void
    onReject?: (prop: any) => void
    onArchive?: (id: string) => void
    onTogglePublish?: (id: string, isPublished: boolean) => void
    userRole?: string
    userId?: string | null
}

export function PropertyListItem({ prop, onEdit, onDelete, onView, onSend, onApprove, onReject, onArchive, onTogglePublish, userRole, userId }: PropertyListItemProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const isOwner = userId && prop.created_by && (
        userId === prop.created_by || 
        userId === prop.created_by?.id
    )
    const canEdit = isAdmin || isOwner
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
    const formattedPrice = prop.price
        ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}`
        : 'Sob consulta'

    const formattedCondo = prop.details?.valor_condominio
        ? `C: R$ ${Number(prop.details.valor_condominio).toLocaleString('pt-BR')}`
        : null

    const formattedIptu = prop.details?.valor_iptu
        ? `I: R$ ${Number(prop.details.valor_iptu).toLocaleString('pt-BR')}`
        : null

    const amenities = [
        { id: 'portaria_24h', icon: <Shield size={12} className="text-foreground" />, label: 'P24h' },
        { id: 'portaria_virtual', icon: <Shield size={12} className="text-foreground" />, label: 'PV' },
        { id: 'piscina', icon: <Waves size={12} className="text-foreground" />, label: 'Pisc' },
        { id: 'piscina_aquecida', icon: <Waves size={12} className="text-foreground" />, label: 'PiscA' },
        { id: 'espaco_gourmet', icon: <Utensils size={12} className="text-foreground" />, label: 'Gour' },
        { id: 'salao_festas', icon: <PartyPopper size={12} className="text-foreground" />, label: 'Fest' },
        { id: 'academia', icon: <Dumbbell size={12} className="text-foreground" />, label: 'Acad' },
        { id: 'sala_jogos', icon: <Gamepad2 size={12} className="text-foreground" />, label: 'Jog' },
        { id: 'sala_estudos_coworking', icon: <BookOpen size={12} className="text-foreground" />, label: 'Est' },
        { id: 'sala_cinema', icon: <Film size={12} className="text-foreground" />, label: 'Cine' },
        { id: 'playground', icon: <Play size={12} className="text-foreground" />, label: 'Play' },
        { id: 'brinquedoteca', icon: <Baby size={12} className="text-foreground" />, label: 'Brin' }
    ]

    return (
        <tr 
            onClick={() => onView(prop)}
            className="hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-left-2 duration-300 cursor-pointer"
        >
            <td className="px-4 py-5 min-w-[250px] md:min-w-0">
                <div className="flex items-center gap-4">
                    <div className="text-left max-w-md">
                        <div className="font-bold text-foreground text-sm line-clamp-1">
                            {prop.title ? prop.title.replace(/\s*-\s*Apto\s+.*/i, '') : ''}
                        </div>
                        {prop.details?.endereco?.apto && (
                            <div className="flex items-center gap-1 text-foreground text-[10px] mt-0.5">
                                <Home size={10} />
                                <span>Apto {prop.details.endereco.apto}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-foreground text-[10px] mt-0.5">
                            <MapPin size={10} />
                            <span className="line-clamp-1">
                                {prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}
                            </span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-5 text-center">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-foreground">{translatePropertyType(prop.type)}</span>
                    {prop.details?.situacao && (
                        <div className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm w-fit ${getSituacaoStyles(prop.details.situacao)}`}>
                            {prop.details.situacao}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-5">
                <div className="flex flex-col gap-1 items-center">
                    <div className="flex items-center gap-1 text-foreground" title="Dormitórios">
                        <BedDouble size={12} />
                        <span className="text-[11px] font-semibold">{prop.details?.dormitorios || prop.details?.quartos || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Banheiros">
                        <Bath size={14} />
                        <span className="text-[11px] font-semibold">{prop.details?.banheiros || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Vagas">
                        <Car size={14} />
                        <span className="text-[11px] font-semibold">
                            {prop.details?.vagas || 0}
                            {prop.details?.vagas_numeracao && <span className="ml-1 text-[9px] text-foreground">({prop.details.vagas_numeracao})</span>}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-4 py-5">
                <div className="flex flex-col gap-1 items-center">
                    {(() => {
                        const type = (prop.type || prop.details?.type || '').toLowerCase()
                        const d = prop.details || {}
                        const fmt = (v: any) => v ? String(v).replace(/\s*m[²2]/gi, '') + 'm²' : null
                        if (type === 'land') {
                            return (d.area_total || d.area_terreno) ? (
                                <div className="flex items-center gap-1 text-foreground" title="Área do Terreno">
                                    <Maximize2 size={12} />
                                    <span className="text-[10px] font-semibold">{fmt(d.area_total || d.area_terreno)}</span>
                                </div>
                            ) : null
                        }
                        if (type === 'house' || type === 'rural') {
                            return (
                                <>
                                    {(d.area_construida || d.area_util) ? (
                                        <div className="flex items-center gap-1 text-foreground" title="Área Construída">
                                            <Maximize2 size={12} />
                                            <span className="text-[10px] font-semibold">{fmt(d.area_construida || d.area_util)}</span>
                                        </div>
                                    ) : null}
                                    {(d.area_total || d.area_terreno) ? (
                                        <div className="flex items-center gap-1 text-foreground/50" title="Área Terreno">
                                            <Maximize2 size={10} />
                                            <span className="text-[10px] font-semibold">{fmt(d.area_total || d.area_terreno)}</span>
                                        </div>
                                    ) : null}
                                </>
                            )
                        }
                        // apartment, penthouse, studio, commercial, etc.
                        return (
                            <>
                                {(d.area_privativa || d.area_util) ? (
                                    <div className="flex items-center gap-1 text-foreground" title="Área Privativa">
                                        <Maximize2 size={12} />
                                        <span className="text-[10px] font-semibold">{fmt(d.area_privativa || d.area_util)}</span>
                                    </div>
                                ) : null}
                                {d.area_total ? (
                                    <div className="flex items-center gap-1 text-foreground/50" title="Área Total">
                                        <Maximize2 size={10} />
                                        <span className="text-[10px] font-semibold">{fmt(d.area_total)}</span>
                                    </div>
                                ) : null}
                            </>
                        )
                    })()}
                </div>
            </td>
            <td className="px-4 py-5">
                <div className="flex flex-col gap-1 items-center">
                    <div className="font-bold text-foreground text-sm whitespace-nowrap">{formattedPrice}</div>
                    {formattedCondo && <div className="text-[10px] text-foreground font-medium">{formattedCondo}</div>}
                    {formattedIptu && <div className="text-[10px] text-foreground font-medium">{formattedIptu}</div>}
                </div>
            </td>
            <td className="px-4 py-5">
                <div className="flex flex-col gap-1.5 items-center">
                    {(isAdmin || prop.status === 'Pending') && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase whitespace-nowrap w-fit tracking-wider shadow-sm ${getStatusStyles(prop.status)}`}>
                            {translateStatus(prop.status)}
                        </span>
                    )}
                    {/* Badge de rejeição visível para o corretor dono do imóvel */}
                    {!isAdmin && isOwner && prop.rejection_note && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full" title={prop.rejection_note}>
                            <AlertTriangle size={9} className="text-red-500 shrink-0" />
                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Ver motivo</span>
                        </div>
                    )}
                    {isAdmin && onTogglePublish && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onTogglePublish(prop.id, !prop.is_published)
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all ${
                                prop.is_published
                                    ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25'
                                    : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'
                            }`}
                            title={prop.is_published ? 'Publicado no site – clique para remover' : 'Não publicado – clique para publicar no site'}
                        >
                            <Globe size={9} strokeWidth={2.5} />
                            Site
                        </button>
                    )}
                </div>
            </td>
            <td className="px-4 py-5 text-center">
                <div className="flex items-center justify-center" ref={dropdownRef}>
                    {isAdmin && prop.status === 'Pending' && onApprove && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onApprove(prop.id) }}
                            className="p-2 mr-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            title="Autorizar Imóvel"
                        >
                            <FileText size={16} />
                        </button>
                    )}
                    {isAdmin && prop.status === 'Pending' && onReject && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReject(prop) }}
                            className="p-2 mr-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            title="Reprovar Imóvel"
                        >
                            <XCircle size={16} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o) }}
                        className="p-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors shadow-sm"
                        title="Ações"
                    >
                        <MoreVertical size={16} />
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-6 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30">
                            <button
                                onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onSend(prop) }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                            >
                                <Send size={14} className="text-emerald-500" />
                                Enviar para Lead
                            </button>
                            {canEdit && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onEdit(prop) }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <Edit size={14} className="text-blue-500" />
                                        Editar
                                    </button>
                                    {onArchive && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onArchive(prop.id) }}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-amber-500/10 transition-colors"
                                        >
                                            <Archive size={14} className="text-amber-500" />
                                            Arquivar
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onDelete(prop.id) }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                        Excluir
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    )
}
