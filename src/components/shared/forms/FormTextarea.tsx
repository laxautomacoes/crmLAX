'use client'

import { TextareaHTMLAttributes } from 'react'

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
}

export function FormTextarea({ label, error, className = '', ...props }: FormTextareaProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-bold text-foreground ml-1 mb-1">
                    {label}
                </label>
            )}
            <textarea
                className={`
                    w-full rounded-lg border border-muted-foreground/30 bg-card text-foreground text-sm outline-none transition-all
                    focus:ring-2 focus:ring-secondary/50 focus:border-secondary
                    disabled:opacity-50 disabled:cursor-not-allowed
                    placeholder:text-muted-foreground/50
                    px-4 py-2
                    min-h-[100px]
                    resize-none
                    ${error ? 'border-red-500 focus:ring-red-500/20' : ''}
                    ${className}
                `}
                {...props}
            />
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
