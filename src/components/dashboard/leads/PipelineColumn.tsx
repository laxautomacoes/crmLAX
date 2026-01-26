'use client'

import { MoreHorizontal, Plus, Copy, Trash2, Edit2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { LeadCard } from './LeadCard'
import { Lead } from './PipelineBoard'

interface PipelineColumnProps {
    id: string
    title: string
    leads: Lead[]
    count: number
    onAddLead: (stageId: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onEditLead: (lead: Lead) => void
    onDeleteLead: (leadId: string) => void
}

export function PipelineColumn({ id, title, leads, count, onAddLead, onDeleteStage, onDuplicateStage, onRenameStage, onEditLead, onDeleteLead }: PipelineColumnProps) {
    const [showDropdown, setShowDropdown] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(title)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const { setNodeRef } = useDroppable({
        id: id,
    })

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleRename = () => {
        if (editValue.trim() && editValue !== title) {
            onRenameStage(id, editValue.trim())
        } else {
            setEditValue(title)
        }
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRename()
        if (e.key === 'Escape') {
            setEditValue(title)
            setIsEditing(false)
        }
    }

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col w-[310px] min-w-[310px] bg-input/50 dark:bg-muted/5 rounded-2xl p-4 border border-muted-foreground/30 shadow-sm"
        >
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2 flex-1">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={handleKeyDown}
                            className="bg-card border border-primary text-[13px] font-bold text-foreground px-2 py-0.5 rounded-md outline-none w-full uppercase tracking-widest"
                        />
                    ) : (
                        <h3 className="font-bold text-foreground/80 dark:text-foreground text-[13px] uppercase tracking-widest leading-none truncate">
                            {title}
                        </h3>
                    )}
                    <span className="bg-card px-2 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground border border-muted-foreground/30 flex-shrink-0">
                        {count}
                    </span>
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-card rounded"
                    >
                        <MoreHorizontal size={16} />
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
                                    onClick={() => {
                                        setIsEditing(true)
                                        setShowDropdown(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted/10 flex items-center gap-2 transition-colors"
                                >
                                    <Edit2 size={12} /> Renomear
                                </button>
                                <button
                                    onClick={() => {
                                        onDuplicateStage(id)
                                        setShowDropdown(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted/10 flex items-center gap-2 transition-colors"
                                >
                                    <Copy size={12} /> Duplicar
                                </button>
                                <div className="h-px bg-muted-foreground/30 my-1" />
                                <button
                                    onClick={() => {
                                        onDeleteStage(id)
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
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-4 min-h-[200px]">
                <SortableContext
                    id={id}
                    items={leads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} onEdit={onEditLead} onDelete={onDeleteLead} />
                    ))}
                </SortableContext>

                <button
                    onClick={() => onAddLead(id)}
                    className="w-full py-2.5 border border-muted-foreground/30 rounded-lg text-muted-foreground flex items-center justify-center gap-2 hover:text-foreground hover:bg-card transition-all text-xs font-bold group mt-2 shadow-sm"
                >
                    <Plus size={14} className="group-hover:text-foreground transition-colors" />
                    Novo Lead
                </button>
            </div>
        </div>
    )
}
