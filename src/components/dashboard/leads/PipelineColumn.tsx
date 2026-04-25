'use client'

import { MoreHorizontal, Plus, Copy, Trash2, Edit2, Palette, Check } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { LeadCard } from './LeadCard'
import { Lead } from './PipelineBoard'

const PRESET_COLORS = [
    { hex: '#3B82F6', label: 'Novo' },
    { hex: '#FACC15', label: 'Atendimento' },
    { hex: '#F59E0B', label: 'Visita' },
    { hex: '#F97316', label: 'Negociação' },
    { hex: '#22C55E', label: 'Venda Feita' },
    { hex: '#EF4444', label: 'Perdido' },
]

interface PipelineColumnProps {
    id: string
    title: string
    color?: string
    leads: Lead[]
    count: number
    onAddLead: (stageId: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onUpdateColor: (stageId: string, color: string) => void
    onEditLead: (lead: Lead) => void
    onDeleteLead: (leadId: string) => void
    onArchiveLead: (leadId: string) => void
}

export function PipelineColumn({ id, title, color, leads, count, onAddLead, onDeleteStage, onDuplicateStage, onRenameStage, onUpdateColor, onEditLead, onDeleteLead, onArchiveLead }: PipelineColumnProps) {
    const [showDropdown, setShowDropdown] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(title)
    const [customColor, setCustomColor] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const colorPickerRef = useRef<HTMLDivElement>(null)

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
                setShowColorPicker(false)
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

    const handleColorSelect = (hex: string) => {
        onUpdateColor(id, hex)
        setShowColorPicker(false)
        setShowDropdown(false)
    }

    const handleCustomColorSubmit = () => {
        if (customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor)) {
            handleColorSelect(customColor)
            setCustomColor('')
        }
    }

    const currentColor = color || null
    const hasBorderColor = currentColor && currentColor !== '#FFFFFF'

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col w-[280px] min-w-[280px] md:w-[310px] md:min-w-[310px] rounded-2xl p-4 border border-muted-foreground/30 shadow-sm bg-card dark:bg-card overflow-hidden"
            style={{
                borderTop: hasBorderColor ? `4px solid ${currentColor}` : undefined,
            }}
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
                        onClick={() => {
                            setShowDropdown(!showDropdown)
                            setShowColorPicker(false)
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-card rounded"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    <AnimatePresence>
                        {showDropdown && !showColorPicker && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-40 bg-card border border-muted-foreground/30 rounded-lg shadow-xl z-20 py-1"
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
                                    onClick={() => setShowColorPicker(true)}
                                    className="w-full text-left px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted/10 flex items-center gap-2 transition-colors"
                                >
                                    <Palette size={12} /> Cor do Estágio
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
                                    className="w-full text-left px-3 py-2 text-[11px] font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] flex items-center gap-2 transition-colors rounded-b-md"
                                >
                                    <Trash2 size={12} /> Excluir
                                </button>
                            </motion.div>
                        )}

                        {showDropdown && showColorPicker && (
                            <motion.div
                                ref={colorPickerRef}
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-48 bg-card border border-muted-foreground/30 rounded-lg shadow-xl z-20 p-3"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Cor do Estágio</span>
                                    <button
                                        onClick={() => setShowColorPicker(false)}
                                        className="text-muted-foreground hover:text-foreground text-[10px] font-bold"
                                    >
                                        ← Voltar
                                    </button>
                                </div>

                                {/* Bolinhas de cores predefinidas */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {PRESET_COLORS.map((preset) => (
                                        <button
                                            key={preset.hex}
                                            onClick={() => handleColorSelect(preset.hex)}
                                            title={preset.label}
                                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                                            style={{
                                                backgroundColor: preset.hex,
                                                borderColor: currentColor === preset.hex
                                                    ? 'var(--foreground)'
                                                    : preset.hex === '#FFFFFF'
                                                        ? 'var(--muted-foreground)'
                                                        : preset.hex,
                                            }}
                                        >
                                            {currentColor === preset.hex && (
                                                <Check
                                                    size={12}
                                                    style={{
                                                        color: preset.hex === '#FFFFFF' || preset.hex === '#FACC15'
                                                            ? '#404F4F'
                                                            : '#FFFFFF'
                                                    }}
                                                    strokeWidth={3}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Input de cor customizada */}
                                <div className="border-t border-muted-foreground/30 pt-2">
                                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                        Cor personalizada
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="color"
                                            value={customColor || currentColor || '#FFFFFF'}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            className="w-7 h-7 rounded-md border border-muted-foreground/30 cursor-pointer p-0.5"
                                        />
                                        <input
                                            type="text"
                                            placeholder="#HEX"
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCustomColorSubmit()}
                                            className="flex-1 bg-background border border-muted-foreground/30 rounded-md px-2 py-1 text-[10px] text-foreground outline-none focus:border-primary font-mono"
                                        />
                                        <button
                                            onClick={handleCustomColorSubmit}
                                            disabled={!customColor || !/^#[0-9A-Fa-f]{6}$/.test(customColor)}
                                            className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-[9px] font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
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
                        <LeadCard 
                            key={lead.id} 
                            lead={lead} 
                            onEdit={onEditLead} 
                            onDelete={onDeleteLead} 
                            onArchive={onArchiveLead}
                        />
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
