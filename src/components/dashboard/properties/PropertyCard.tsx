'use client'

import { Home, MapPin, BedDouble, Bath, Square, Car, Trash2, Edit } from 'lucide-react'

interface PropertyCardProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
}

export function PropertyCard({ prop, onEdit, onDelete }: PropertyCardProps) {
    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="aspect-video bg-muted relative">
                {prop.images?.[0] ? (
                    <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-[#F9FAFB]">
                        <Home size={40} strokeWidth={1} />
                    </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(prop)}
                        className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-[#404F4F] hover:bg-white"
                        title="Editar"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(prop.id)}
                        className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-red-500 hover:bg-white"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-[#404F4F]">
                    {prop.type}
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div>
                    <h3 className="font-bold text-[#404F4F] text-lg leading-tight line-clamp-1">{prop.title}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                        <MapPin size={12} />
                        <span className="line-clamp-1">{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3 border-y border-gray-50">
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
                    <div className="flex items-center gap-1 text-muted-foreground" title="Área">
                        <Square size={16} />
                        <span className="text-xs font-semibold">{prop.details?.area_util || 0}m²</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#404F4F]">
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
