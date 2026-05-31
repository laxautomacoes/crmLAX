import { MoreVertical, Edit, Trash2, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lead } from './PipelineBoard'
import { LeadTemperatureBadge } from './LeadTemperatureBadge'

interface LeadCardProps {
    lead: Lead
    onEdit?: (lead: Lead) => void
    onDelete?: (leadId: string) => void
    onArchive?: (leadId: string) => void
    isOverlay?: boolean
}

export function LeadCard({ lead, isOverlay, onEdit, onDelete, onArchive }: LeadCardProps) {
    const [showDropdown, setShowDropdown] = useState(false)
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
            style={{ ...style, backgroundColor: 'var(--background)' }}
            {...attributes}
            {...listeners}
            onClick={() => !isDragging && onEdit?.(lead)}
            className={`p-4 rounded-xl border border-muted-foreground/30 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group w-full relative ${isOverlay ? 'shadow-2xl' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h4 className="font-bold text-foreground text-sm leading-tight mb-2">
                        {lead.name}
                    </h4>
                    {lead.interest && (
                        <span className="inline-block px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-bold shadow-sm transition-colors border border-muted-foreground/30">
                            {lead.interest}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {lead.has_proposal && (
                        <span
                            className="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full shrink-0"
                            style={{ backgroundColor: '#FFE600', color: '#1a1a1a' }}
                            title="Lead com proposta"
                        >
                            P
                        </span>
                    )}
                    <LeadTemperatureBadge lastInteractionAt={lead.last_interaction_at} />
                    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowDropdown(!showDropdown)
                            }}
                            className="p-1 hover:bg-muted/50 rounded text-muted-foreground transition-colors"
                        >
                            <MoreVertical size={14} />
                        </button>

                        <AnimatePresence>
                            {showDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 mt-1 w-36 bg-card border border-muted-foreground/30 rounded-lg shadow-xl z-20 py-1"
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
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onArchive?.(lead.id)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full text-left px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted/10 flex items-center gap-2 transition-colors"
                                    >
                                        <FileText size={12} /> Arquivar
                                    </button>
                                    <div className="h-px bg-muted-foreground/30 my-1" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete?.(lead.id)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full text-left px-3 py-2 text-[11px] font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] flex items-center gap-2 transition-colors rounded-b-md"
                                    >
                                        <Trash2 size={12} /> Excluir
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}
