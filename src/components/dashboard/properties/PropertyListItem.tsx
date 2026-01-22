'use client'

import { Home, MapPin, BedDouble, Bath, Square, Car, Trash2, Edit } from 'lucide-react'

interface PropertyListItemProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
}

export function PropertyListItem({ prop, onEdit, onDelete }: PropertyListItemProps) {
    const formattedPrice = prop.price
        ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}`
        : 'Sob consulta'

    return (
        <tr className="hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-left-2 duration-300">
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        {prop.images?.[0] ? (
                            <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                <Home size={20} />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="font-bold text-[#404F4F] text-sm line-clamp-1">{prop.title}</div>
                        <div className="flex items-center gap-1 text-muted-foreground text-[10px] mt-0.5">
                            <MapPin size={10} />
                            <span className="line-clamp-1">{prop.details?.endereco?.bairro || 'Bairro ñ inf.'}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="text-xs font-medium text-muted-foreground capitalize">{prop.type}</span>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-muted-foreground" title="Quartos">
                        <BedDouble size={14} />
                        <span className="text-[11px] font-semibold">{prop.details?.quartos || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground" title="Banheiros">
                        <Bath size={14} />
                        <span className="text-[11px] font-semibold">{prop.details?.banheiros || 0}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-muted-foreground" title="Área">
                    <Square size={14} />
                    <span className="text-[11px] font-semibold">{prop.details?.area_util || 0}m²</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="font-bold text-[#404F4F] text-sm whitespace-nowrap">{formattedPrice}</div>
            </td>
            <td className="px-6 py-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${prop.status === 'Disponível' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {prop.status}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onEdit(prop)}
                        className="p-2 hover:bg-[#404F4F]/5 rounded-lg text-[#404F4F] transition-colors"
                        title="Editar"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(prop.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    )
}
