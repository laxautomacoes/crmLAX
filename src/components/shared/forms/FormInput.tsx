'use client'

import { InputHTMLAttributes } from 'react'
import { LucideIcon } from 'lucide-react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode
    error?: string
    icon?: LucideIcon
    rightElement?: React.ReactNode
}

export function FormInput({ label, error, icon: Icon, rightElement, className = '', ...props }: FormInputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-[11px] font-bold text-muted-foreground ml-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-tight">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    className={`
                        w-full rounded-lg border border-border bg-card text-foreground text-sm outline-none transition-all
                        focus:ring-2 focus:ring-secondary/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        placeholder:text-muted-foreground/50
                        ${Icon ? 'pl-10' : 'px-4'}
                        ${rightElement ? 'pr-10' : 'pr-4'}
                        ${props.type === 'number' && !Icon && !rightElement ? 'px-3' : ''}
                        ${error ? 'border-red-500 focus:ring-red-500/20' : ''}
                        py-2
                        ${className}
                    `}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
