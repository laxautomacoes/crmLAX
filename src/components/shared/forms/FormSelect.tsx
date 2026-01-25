'use client'

import { SelectHTMLAttributes } from 'react'
import { ChevronDown, LucideIcon } from 'lucide-react'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    icon?: LucideIcon
    options: Array<{ value: string; label: string }>
}

export function FormSelect({ label, error, icon: Icon, options, className = '', ...props }: FormSelectProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-bold text-muted-foreground ml-1 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}
                <select
                    className={`
                        w-full rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all
                        focus:ring-2 focus:ring-secondary/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        appearance-none pr-10
                        ${Icon ? 'pl-10' : 'px-3'}
                        py-2
                        ${error ? 'border-red-500 focus:ring-red-500/20' : ''}
                        ${className}
                    `}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" 
                    size={16} 
                />
            </div>
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
