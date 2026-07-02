'use client'

import React from 'react'

interface FormLabelProps {
    children: React.ReactNode
    className?: string
}

export function FormLabel({ children, className = '' }: FormLabelProps) {
    return (
        <label className={`block text-xs font-bold text-foreground ml-1 mb-2 ${className}`}>
            {children}
        </label>
    )
}
