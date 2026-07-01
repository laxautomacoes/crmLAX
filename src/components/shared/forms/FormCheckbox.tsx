'use client'

import React from 'react'

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
    labelClassName?: string
}

export function FormCheckbox({ label, error, className = '', labelClassName, ...props }: FormCheckboxProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer group">
                <input
                    type="checkbox"
                    className={`w-4 h-4 rounded border border-border/40 bg-background accent-secondary focus:ring-secondary/50 transition-all cursor-pointer ${className}`}
                    {...props}
                />
                <span className={`font-medium text-foreground transition-colors ${labelClassName || 'text-sm'}`}>
                    {label}
                </span>
            </label>
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    )
}
