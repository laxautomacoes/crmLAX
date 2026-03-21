'use client'

import React from 'react'
import { motion } from 'framer-motion'
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
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-[#00B087]" : "bg-muted-foreground/20"
                )}
            >
                <motion.span
                    animate={{
                        x: checked ? 22 : 2,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                    }}
                    className={cn(
                        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0"
                    )}
                />
            </button>
        </div>
    )
}
