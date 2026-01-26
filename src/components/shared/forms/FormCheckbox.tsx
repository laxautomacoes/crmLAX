'use client'

import React from 'react'

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
}

export function FormCheckbox({ label, error, className = '', ...props }: FormCheckboxProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer group">
                <input
                    type="checkbox"
                    className={`w-4 h-4 rounded border border-muted-foreground/30 bg-card text-secondary focus:ring-secondary/50 transition-all ${className}`}
                    {...props}
                />
                <span className="text-xs font-medium text-foreground group-hover:text-secondary transition-colors">
                    {label}
                </span>
            </label>
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    )
}
