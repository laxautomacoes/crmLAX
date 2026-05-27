'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getLeadTemperature,
    getTemperatureColor,
    getTemperatureLabel,
    getTemperatureDescription,
    getDaysSinceInteraction,
    type LeadTemperature
} from '@/lib/utils/lead-temperature'

interface LeadTemperatureBadgeProps {
    lastInteractionAt: string | null | undefined
    size?: 'sm' | 'md'
}

export function LeadTemperatureBadge({ lastInteractionAt, size = 'sm' }: LeadTemperatureBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false)
    const badgeRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const temp = getLeadTemperature(lastInteractionAt)
    const days = getDaysSinceInteraction(lastInteractionAt)
    const color = getTemperatureColor(temp)
    const label = getTemperatureLabel(temp)
    const description = getTemperatureDescription(temp, days)

    const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
    const pulseSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
                setShowTooltip(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setShowTooltip(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setShowTooltip(false), 150)
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowTooltip(!showTooltip)
    }

    return (
        <div
            ref={badgeRef}
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            {/* Bolinha */}
            <div className="relative flex items-center justify-center cursor-pointer">
                <div
                    className={`${dotSize} rounded-full transition-colors duration-300`}
                    style={{ backgroundColor: color }}
                />
                {/* Pulse animation para lead frio */}
                {temp === 'cold' && (
                    <div
                        className={`absolute ${pulseSize} rounded-full animate-ping opacity-40`}
                        style={{ backgroundColor: color }}
                    />
                )}
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 min-w-[180px]"
                    >
                        <div className="bg-card border border-muted-foreground/30 rounded-lg shadow-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                                    {label}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed ml-4">
                                {getInteractionText(days)}
                            </p>
                            <div className="mt-2 pt-2 border-t border-muted-foreground/10 space-y-1">
                                {getThresholdItems().map((item, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <div
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className={`text-[9px] ${temp === item.key ? 'text-foreground font-bold' : 'text-muted-foreground/70'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function getInteractionText(days: number | null): string {
    if (days === null) return 'Sem interação registrada'
    if (days === 0) return 'Última interação hoje'
    const plural = days === 1 ? 'dia' : 'dias'
    return `Última interação há ${days} ${plural}`
}

interface ThresholdItem {
    key: LeadTemperature
    color: string
    label: string
}

function getThresholdItems(): ThresholdItem[] {
    return [
        { key: 'hot', color: '#22C55E', label: 'Quente — até 7 dias' },
        { key: 'warm', color: '#FACC15', label: 'Morno — 8 a 15 dias' },
        { key: 'cold', color: '#EF4444', label: 'Frio — 16 a 30 dias' },
        { key: 'inactive', color: '#6B7280', label: 'Inativo — mais de 30 dias' },
    ]
}
