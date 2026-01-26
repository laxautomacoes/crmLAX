'use client'

import { Home, MapPin, BedDouble, Bath, Square, Car, Trash2, Edit, Video, FileText, Send } from 'lucide-react'
import { translatePropertyType } from '@/utils/property-translations'

interface PropertyCardProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    userRole?: string
}

const getPropertyTypeStyles = (type: string) => {
    const types: Record<string, string> = {
        'apartment': 'bg-blue-600 text-white',
        'house': 'bg-emerald-600 text-white',
        'land': 'bg-amber-600 text-white',
        'commercial': 'bg-indigo-600 text-white',
        'penthouse': 'bg-purple-600 text-white',
        'studio': 'bg-pink-600 text-white',
        'rural': 'bg-green-600 text-white',
        'warehouse': 'bg-slate-600 text-white',
        'office': 'bg-cyan-600 text-white',
        'store': 'bg-rose-600 text-white'
    }
    return types[type.toLowerCase()] || 'bg-primary text-primary-foreground'
}

export function PropertyCard({ prop, onEdit, onDelete, onView, onSend, userRole }: PropertyCardProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    return (
        <div 
            onClick={() => onView(prop)}
            className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer"
        >
            <div className="aspect-video bg-muted relative">
                {prop.images?.[0] ? (
                    <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
                        <Home size={40} strokeWidth={1} />
                    </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onSend(prop)
                        }}
                        className="p-2 bg-green-600 rounded-lg shadow-sm text-white hover:bg-green-700 transition-colors"
                        title="Enviar para Lead"
                    >
                        <Send size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(prop)
                        }}
                        className="p-2 bg-gray-700 rounded-lg shadow-sm text-white hover:bg-gray-800 transition-colors"
                        title="Editar"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(prop.id)
                        }}
                        className="p-2 bg-red-600 rounded-lg shadow-sm text-white hover:bg-red-700 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${getPropertyTypeStyles(prop.type)}`}>
                            {translatePropertyType(prop.type)}
                        </div>
                        {prop.videos?.length > 0 && (
                            <div className="px-1.5 py-0.5 bg-violet-700 rounded flex items-center gap-1 text-[10px] font-black text-white shadow-sm" title={`${prop.videos.length} vídeo(s)`}>
                                <Video size={10} strokeWidth={3} />
                                {prop.videos.length}
                            </div>
                        )}
                        {prop.documents?.length > 0 && (
                            <div className="px-1.5 py-0.5 bg-orange-600 rounded flex items-center gap-1 text-[10px] font-black text-white shadow-sm" title={`${prop.documents.length} documento(s)`}>
                                <FileText size={10} strokeWidth={3} />
                                {prop.documents.length}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1">{prop.title}</h3>
                        {prop.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1 italic">
                                {prop.description}
                            </p>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                            <MapPin size={12} />
                            <span className="line-clamp-1">{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3 border-y border-border">
                    <div className="flex items-center gap-1 text-muted-foreground" title="Dormitórios">
                        <BedDouble size={16} />
                        <span className="text-xs font-semibold">{prop.details?.dormitorios || prop.details?.quartos || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Banheiros">
                        <Bath size={16} />
                        <span className="text-xs font-semibold">{prop.details?.banheiros || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Vagas">
                        <Car size={16} />
                        <span className="text-xs font-semibold">{prop.details?.vagas || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Área Construída">
                        <Square size={16} />
                        <span className="text-xs font-semibold">{prop.details?.area_construida || prop.details?.area_util || 0}m²</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                        {prop.price ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                    </span>
                    {isAdmin && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                            prop.status === 'Disponível' ? 'bg-green-100 text-green-700' : 
                            prop.status === 'Pendente' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                            }`}>
                            {prop.status}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
