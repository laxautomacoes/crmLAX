import { MoreVertical, Edit, Trash2, FileText, User } from 'lucide-react'
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
    onProposalClick?: (contactId: string, leadId: string) => void
    isOverlay?: boolean
}

export function LeadCard({ lead, isOverlay, onEdit, onDelete, onArchive, onProposalClick }: LeadCardProps) {
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
            className={`p-4 rounded-lg border border-muted-foreground/30 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group w-full relative ${isOverlay ? 'shadow-2xl' : ''}`}
        >
            <div className="flex justify-between items-start gap-2 w-full min-w-0">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground flex-shrink-0 border border-border/10">
                            {lead.avatar_url ? (
                                <img src={lead.avatar_url} alt={lead.name} className="w-full h-full object-cover" />
                            ) : (
                                <User size={12} />
                            )}
                        </div>
                        <h4 className="font-bold text-foreground text-sm leading-tight truncate flex-1" title={lead.name}>
                            {lead.name}
                        </h4>
                    </div>
                    {(lead.interest || lead.partner_id) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 min-w-0">
                            {lead.interest && (
                                <span className="inline-block px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-bold transition-colors border border-muted-foreground/30 truncate max-w-[180px]" title={lead.interest}>
                                    {lead.interest}
                                </span>
                            )}
                            {lead.partner_id && (
                                <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 rounded-full text-[10px] font-bold border border-blue-200/60 dark:border-blue-500/20 whitespace-nowrap">
                                    Parceria
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {lead.has_proposal && (
                        <LeadProposalBadge
                            contactId={lead.contact_id}
                            leadId={lead.id}
                            onProposalClick={onProposalClick}
                        />
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

interface LeadProposalBadgeProps {
    contactId: string | undefined
    leadId: string
    onProposalClick?: (contactId: string, leadId: string) => void
}

function LeadProposalBadge({ contactId, leadId, onProposalClick }: LeadProposalBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false)
    const badgeRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
                setShowTooltip(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setShowTooltip(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setShowTooltip(false), 150)
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (contactId) {
            onProposalClick?.(contactId, leadId)
        }
    }

    return (
        <div
            ref={badgeRef}
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={handleClick}
                className="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full shrink-0 hover:scale-105 transition-transform cursor-pointer relative"
                style={{ backgroundColor: '#FFE600', color: '#1a1a1a' }}
            >
                P
            </button>

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-card border border-muted-foreground/30 rounded-lg shadow-xl p-3 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                                    Proposta ativa
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Este lead possui propostas cadastradas. Clique aqui para gerenciar e visualizar as propostas deste cliente.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
