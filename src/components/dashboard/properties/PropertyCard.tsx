'use client'

import { Home, MapPin, BedDouble, Bath, Square, Car, Trash2, Edit, Video, FileText, Send } from 'lucide-react'

interface PropertyCardProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
}

export function PropertyCard({ prop, onEdit, onDelete, onView, onSend }: PropertyCardProps) {
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
                        className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-secondary hover:bg-white"
                        title="Enviar para Lead"
                    >
                        <Send size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(prop)
                        }}
                        className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-primary hover:bg-white"
                        title="Editar"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(prop.id)
                        }}
                        className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-red-500 hover:bg-white"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                    <div className="px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-primary">
                        {prop.type}
                    </div>
                    <div className={`px-2 py-1 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider ${prop.approval_status === 'approved' ? 'bg-blue-500/90 text-white' :
                        prop.approval_status === 'rejected' ? 'bg-red-500/90 text-white' :
                            'bg-gray-500/90 text-white'
                        }`}>
                        {prop.approval_status === 'approved' ? 'Aprovado' :
                            prop.approval_status === 'rejected' ? 'Rejeitado' :
                                'Pendente'}
                    </div>
                    {prop.videos?.length > 0 && (
                        <div className="px-1.5 py-1 bg-white/90 backdrop-blur rounded flex items-center gap-1 text-[10px] font-bold text-primary" title={`${prop.videos.length} vídeo(s)`}>
                            <Video size={10} />
                            {prop.videos.length}
                        </div>
                    )}
                    {prop.documents?.length > 0 && (
                        <div className="px-1.5 py-1 bg-white/90 backdrop-blur rounded flex items-center gap-1 text-[10px] font-bold text-primary" title={`${prop.documents.length} documento(s)`}>
                            <FileText size={10} />
                            {prop.documents.length}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1">{prop.title}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                        <MapPin size={12} />
                        <span className="line-clamp-1">{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3 border-y border-border">
                    <div className="flex items-center gap-1 text-muted-foreground" title="Quartos">
                        <BedDouble size={16} />
                        <span className="text-xs font-semibold">{prop.details?.quartos || 0}</span>
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
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${prop.status === 'Disponível' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {prop.status}
                    </span>
                </div>
            </div>
        </div>
    )
}
