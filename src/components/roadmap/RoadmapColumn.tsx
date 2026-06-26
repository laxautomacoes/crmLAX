'use client'

import { MoreVertical, Plus, Copy, Trash2, Edit2, Palette } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { RoadmapCard } from './RoadmapCard'

const PRESET_COLORS = [
    { hex: '#3B82F6', label: 'Novo' },
    { hex: '#FACC15', label: 'Atendimento' },
    { hex: '#F59E0B', label: 'Visita' },
    { hex: '#F97316', label: 'Negociação' },
    { hex: '#22C55E', label: 'Venda Feita' },
    { hex: '#EF4444', label: 'Perdido' },
]

interface RoadmapItem {
    id: string
    title: string
    description?: string
    type: 'feature' | 'fix' | 'roadmap'
    stage_id: string
    published_at: string
}

interface RoadmapColumnProps {
    id: string
    title: string
    color?: string
    items: RoadmapItem[]
    count: number
    isSuperAdmin: boolean
    onAddItem: (stageId: string) => void
    onEditItem: (item: RoadmapItem) => void
    onDeleteItem: (itemId: string) => void
    onRenameStage: (stageId: string, name: string) => void
    onDeleteStage: (stageId: string) => void
    onDuplicateStage: (stageId: string) => void
    onUpdateColor: (stageId: string, color: string) => void
}

export function RoadmapColumn({
    id, title, color, items, count, isSuperAdmin,
    onAddItem, onEditItem, onDeleteItem,
    onRenameStage, onDeleteStage, onDuplicateStage, onUpdateColor
}: RoadmapColumnProps) {
    const [showDropdown, setShowDropdown] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(title)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const colorPickerRef = useRef<HTMLDivElement>(null)

    const { setNodeRef } = useDroppable({ id })

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

    const currentColor = color || null
    const hasBorderColor = currentColor && currentColor !== '#FFFFFF'

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col w-[280px] min-w-[280px] md:w-[310px] md:min-w-[310px] rounded-lg p-4 border border-muted-foreground/30 shadow-sm bg-card dark:bg-card overflow-hidden h-full"
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
                        <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                        {showDropdown && !showColorPicker && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-40 bg-card border border-muted-foreground/30 rounded-lg shadow-xl z-20 py-1"
                            >
                                {isSuperAdmin && (
                                    <>
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
                                    </>
                                )}
                            </motion.div>
                        )}

                        {showDropdown && showColorPicker && (
                            <ColorPicker
                                currentColor={currentColor}
                                onColorSelect={handleColorSelect}
                                onClose={() => setShowColorPicker(false)}
                                colorPickerRef={colorPickerRef}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <hr className="border-t border-muted-foreground/20 -mx-4 mb-4" />

            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-4 min-h-0">
                <SortableContext
                    id={id}
                    items={items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map(item => (
                        <RoadmapCard
                            key={item.id}
                            item={item}
                            isSuperAdmin={isSuperAdmin}
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                        />
                    ))}
                </SortableContext>

                {isSuperAdmin && (
                    <button
                        onClick={() => onAddItem(id)}
                        className="w-full py-2.5 border border-muted-foreground/30 rounded-lg text-muted-foreground flex items-center justify-center gap-2 hover:text-foreground hover:bg-card transition-all text-xs font-bold group mt-2 shadow-sm"
                    >
                        <Plus size={14} className="group-hover:text-foreground transition-colors" />
                        Novo Item
                    </button>
                )}
            </div>
        </div>
    )
}
