'use client'

import { Home, MapPin, BedDouble, Bath, Car, Trash2, Edit, Shield, Waves, Utensils, PartyPopper, Dumbbell, Gamepad2, BookOpen, Film, Play, Baby, FileText, Video, Send, Maximize2 } from 'lucide-react'
import { translatePropertyType, getStatusStyles, getSituacaoStyles } from '@/utils/property-translations'

interface PropertyListItemProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    userRole?: string
    userId?: string | null
}

export function PropertyListItem({ prop, onEdit, onDelete, onView, onSend, userRole, userId }: PropertyListItemProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const isOwner = userId === prop.created_by
    const canEdit = isAdmin || isOwner
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
            className="hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-left-2 duration-300 cursor-pointer"
        >
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-24 h-18 rounded-lg bg-muted flex-shrink-0 overflow-hidden relative group">
                        {prop.images?.[0] ? (
                            <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-foreground/50">
                                <Home size={24} />
                            </div>
                        )}
                        
                        {prop.status === 'Pendente' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="px-1.5 py-0.5 bg-yellow-400 text-yellow-900 rounded text-[8px] font-black uppercase tracking-tighter shadow-lg">Pendente</span>
                            </div>
                        )}

                        <div className="absolute bottom-0 right-0 flex gap-0.5 p-0.5 bg-black/50 rounded-tl-md z-10">
                            {prop.videos?.length > 0 && (
                                <div title={`${prop.videos.length} vídeo(s)`}>
                                    <Video size={10} className="text-foreground" />
                                </div>
                            )}
                            {prop.documents?.length > 0 && (
                                <div title={`${prop.documents.length} documento(s)`}>
                                    <FileText size={10} className="text-foreground" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-left max-w-md">
                        <div className="font-bold text-foreground text-sm line-clamp-1">{prop.title}</div>
                        {prop.details?.situacao && (
                            <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm w-fit ${getSituacaoStyles(prop.details.situacao)}`}>
                                {prop.details.situacao}
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            <div className="flex items-center gap-1 text-foreground text-[10px]">
                                <MapPin size={10} />
                                <span className="line-clamp-1">{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}</span>
                            </div>
                            {prop.details?.torre_bloco && (
                                <div className="text-[10px] text-foreground font-medium italic">
                                    {prop.details.torre_bloco}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <span className="text-xs font-medium text-foreground">{translatePropertyType(prop.type)}</span>
            </td>
            <td className="px-6 py-4">
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
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1 items-center">
                    <div className="flex items-center gap-1 text-foreground" title="Área Construída">
                        <Maximize2 size={12} />
                        <span className="text-[10px] font-semibold">C: {prop.details?.area_construida || prop.details?.area_util || 0}m²</span>
                    </div>
                    {prop.details?.area_privativa && (
                        <div className="flex items-center gap-1 text-foreground" title="Área Privativa">
                            <Maximize2 size={12} className="text-foreground" />
                            <span className="text-[10px] font-semibold">P: {prop.details.area_privativa}m²</span>
                        </div>
                    )}
                    {prop.details?.area_total && (
                        <div className="flex items-center gap-1 text-foreground" title="Área Total">
                            <Maximize2 size={12} className="text-foreground" />
                            <span className="text-[10px] font-semibold">T: {prop.details.area_total}m²</span>
                        </div>
                    )}
                    {prop.details?.area_terreno && (
                        <div className="flex items-center gap-1 text-foreground" title="Área Terreno">
                            <Maximize2 size={12} className="text-foreground" />
                            <span className="text-[10px] font-semibold">Tr: {prop.details.area_terreno}m²</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1 items-center">
                    <div className="font-bold text-foreground text-sm whitespace-nowrap">{formattedPrice}</div>
                    {formattedCondo && <div className="text-[10px] text-foreground font-medium">{formattedCondo}</div>}
                    {formattedIptu && <div className="text-[10px] text-foreground font-medium">{formattedIptu}</div>}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1.5 items-center">
                    {(isAdmin || prop.status === 'Pendente') && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase whitespace-nowrap w-fit tracking-wider shadow-sm ${getStatusStyles(prop.status)}`}>
                            {prop.status}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onSend(prop)
                        }}
                        className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        title="Enviar para Lead"
                    >
                        <Send size={16} />
                    </button>
                    {canEdit && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEdit(prop)
                                }}
                                className="p-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors shadow-sm"
                                title="Editar"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(prop.id)
                                }}
                                className="p-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors shadow-sm"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    )
}
