'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    label?: string
    id?: string
    disabled?: boolean
    className?: string
}

export function Switch({ checked, onChange, label, id, disabled, className }: SwitchProps) {
    const toggleSwitch = () => {
        if (!disabled) {
            onChange(!checked)
        }
    }

    return (
        <div className={cn("flex items-center gap-3", className)}>
            {label && (
                <label 
                    htmlFor={id} 
                    className={cn(
                        "text-xs font-black uppercase tracking-widest cursor-pointer select-none",
                        disabled ? "text-muted-foreground" : "text-foreground"
                    )}
                    onClick={toggleSwitch}
                >
                    {label}
                </label>
            )}
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={toggleSwitch}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-[#00B087]" : "bg-muted-foreground/20"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out",
                        checked ? "translate-x-5" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    )
}
