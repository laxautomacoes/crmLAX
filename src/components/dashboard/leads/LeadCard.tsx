import { Phone, Mail, Tag, MessageSquare, MoreVertical, Sparkles, Edit, Trash2, User, ChevronDown, ChevronUp, CircleDollarSign } from 'lucide-react'
import { formatPhone } from '@/lib/utils/phone'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lead } from './PipelineBoard'

interface LeadCardProps {
    lead: Lead
    onEdit?: (lead: Lead) => void
    onDelete?: (leadId: string) => void
    isOverlay?: boolean
}

export function LeadCard({ lead, isOverlay, onEdit, onDelete }: LeadCardProps) {
    const [showDropdown, setShowDropdown] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => !isDragging && setIsExpanded(!isExpanded)}
            className={`bg-card p-4 rounded-2xl border border-border hover:shadow-md transition-all cursor-grab active:cursor-grabbing group w-full relative ${isOverlay ? 'shadow-2xl' : ''} ${isExpanded ? 'shadow-sm' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h4 className="font-bold text-foreground text-sm leading-tight mb-2">
                        {lead.name}
                    </h4>
                    {lead.interest && (
                        <span className="inline-block px-2.5 py-0.5 bg-[#404F4F] dark:bg-[#FFE600] text-white dark:text-[#404F4F] rounded-full text-[10px] font-bold shadow-sm transition-colors">
                            {lead.interest}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowDropdown(!showDropdown)
                            }}
                            className="p-1 hover:bg-[#404F4F]/5 rounded text-[#404F4F]/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical size={14} />
                        </button>

                        <AnimatePresence>
                            {showDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-xl z-20 py-1"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit?.(lead)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full text-left px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted/10 flex items-center gap-2 transition-colors"
                                    >
                                        <Edit size={12} /> Editar
                                    </button>
                                    <div className="h-px bg-border my-1" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete?.(lead.id)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full text-left px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={12} /> Excluir
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="text-[#404F4F]/60">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-1.5 mb-4 px-0.5">
                            <div className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
                                <Phone size={12} className="text-foreground/70" />
                                <span className="text-foreground/70 dark:text-foreground/80">{formatPhone(lead.phone)}</span>
                            </div>
                            {lead.email && (
                                <div className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
                                    <Mail size={12} className="text-foreground/70" />
                                    <span className="truncate text-foreground/70 dark:text-foreground/80">{lead.email}</span>
                                </div>
                            )}
                            {lead.value && (
                                <div className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
                                    <CircleDollarSign size={12} className="text-foreground/70" />
                                    <span className="text-foreground/70 dark:text-foreground/80">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {lead.notes && (
                            <div className="bg-muted/5 dark:bg-card/50 p-2 rounded-lg mb-4 border border-border/50">
                                <p className="text-[10px] text-muted-foreground italic line-clamp-2">"{lead.notes}"</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-1 mb-4">
                            {lead.tags?.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-muted/5 text-muted-foreground rounded-full text-[9px] font-bold border border-border flex items-center gap-1">
                                    <Tag size={8} /> {tag}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
