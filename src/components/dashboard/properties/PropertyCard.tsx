'use client'

import { Home, MapPin, BedDouble, Bath, Car, Trash2, Edit, Video, FileText, Send, Maximize2 } from 'lucide-react'
import { translatePropertyType, getPropertyTypeStyles, getStatusStyles, getSituacaoStyles } from '@/utils/property-translations'

interface PropertyCardProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    userRole?: string
    userId?: string | null
}

export function PropertyCard({ prop, onEdit, onDelete, onView, onSend, userRole, userId }: PropertyCardProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const isOwner = userId === prop.created_by
    const canEdit = isAdmin || isOwner
    
    return (
        <div 
            onClick={() => onView(prop)}
            className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer"
        >
            <div className="aspect-video bg-muted relative">
                {prop.images?.[0] ? (
                    <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground bg-muted/50">
                        <Home size={40} strokeWidth={1} />
                    </div>
                )}
                
                {prop.status === 'Pendente' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                            Pendente de Aprovação
                        </div>
                    </div>
                )}

                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onSend(prop)
                        }}
                        className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
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
                                className="p-2 bg-foreground text-background rounded-lg shadow-sm hover:bg-foreground/90 transition-colors"
                                title="Editar"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(prop.id)
                                }}
                                className="p-2 bg-foreground text-background rounded-lg shadow-sm hover:bg-foreground/90 transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        {prop.details?.situacao && (
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${getSituacaoStyles(prop.details.situacao)}`}>
                                {prop.details.situacao}
                            </div>
                        )}
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${getPropertyTypeStyles(prop.type)}`}>
                            {translatePropertyType(prop.type)}
                        </div>
                        {prop.videos?.length > 0 && (
                            <div className="px-1.5 py-0.5 bg-foreground/10 rounded flex items-center gap-1 text-[10px] font-black text-foreground shadow-sm" title={`${prop.videos.length} vídeo(s)`}>
                                <Video size={10} strokeWidth={3} />
                                {prop.videos.length}
                            </div>
                        )}
                        {prop.documents?.length > 0 && (
                            <div className="px-1.5 py-0.5 bg-foreground/10 rounded flex items-center gap-1 text-[10px] font-black text-foreground shadow-sm" title={`${prop.documents.length} documento(s)`}>
                                <FileText size={10} strokeWidth={3} />
                                {prop.documents.length}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1">{prop.title}</h3>
                        <div className="flex items-center gap-1 text-foreground text-xs mt-1">
                            <MapPin size={12} />
                            <span className="line-clamp-1">{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-1 text-foreground" title="Dormitórios">
                        <BedDouble size={16} />
                        <span className="text-xs font-semibold">{prop.details?.dormitorios || prop.details?.quartos || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Banheiros">
                        <Bath size={16} />
                        <span className="text-xs font-semibold">{prop.details?.banheiros || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Vagas">
                        <Car size={16} />
                        <span className="text-xs font-semibold">{prop.details?.vagas || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Área Construída">
                        <Maximize2 size={16} />
                        <span className="text-xs font-semibold">{prop.details?.area_construida || prop.details?.area_util || 0}m²</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                        {prop.price ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                    </span>
                    {(isAdmin || prop.status === 'Pendente') && (
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-sm ${getStatusStyles(prop.status)}`}>
                            {prop.status}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
