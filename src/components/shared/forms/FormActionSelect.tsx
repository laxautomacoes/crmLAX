'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Edit2, Trash2, Check } from 'lucide-react'

export interface FormActionSelectOption {
    value: string
    label: string
    id?: string // para identificar no bd (origens customizadas)
    isCustom?: boolean // true se for personalizada e puder ser editada/excluída
}

interface FormActionSelectProps {
    label?: string
    error?: string
    value: string
    onChange: (value: string) => void
    options: FormActionSelectOption[]
    disabled?: boolean
    placeholder?: string
    onEdit?: (option: FormActionSelectOption) => void
    onDelete?: (option: FormActionSelectOption) => void
}

export function FormActionSelect({
    label,
    error,
    value,
    onChange,
    options,
    disabled,
    placeholder = 'selecionar',
    onEdit,
    onDelete
}: FormActionSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedOption = options.find(o => o.value === value)

    return (
        <div className="w-full" ref={dropdownRef}>
            {label && (
                <label className="block text-xs font-bold text-foreground ml-1 mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onKeyDown={(e) => {
                        if (disabled) return
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setIsOpen(!isOpen)
                        }
                    }}
                    className={`
                        w-full rounded-lg border border-border bg-white dark:bg-background text-foreground text-sm outline-none transition-all flex items-center justify-between
                        focus:ring-2 focus:ring-secondary/50 focus:border-secondary pl-3 pr-10 py-2
                        select-none normal-case font-normal tracking-normal
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${error ? 'border-red-500 focus:ring-red-500/20' : ''}
                    `}
                >
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                <ChevronDown 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none" 
                    size={16} 
                />

                {isOpen && !disabled && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                        <div className="max-h-[250px] overflow-y-auto py-1">
                            {options.map((option) => (
                                <div
                                    key={option.value}
                                    className={`group flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer ${value === option.value ? 'bg-muted/50' : ''}`}
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Check size={14} className={value === option.value ? 'text-foreground' : 'text-transparent'} />
                                        <span className="truncate text-sm text-foreground">{option.label}</span>
                                    </div>
                                    
                                    {option.isCustom && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onEdit(option)
                                                    }}
                                                    className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDelete(option)
                                                    }}
                                                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {options.length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                    Nenhuma opção disponível
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
