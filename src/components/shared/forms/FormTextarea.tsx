'use client'

import { TextareaHTMLAttributes, useEffect, useRef } from 'react'

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    autoExpand?: boolean
}

export function FormTextarea({ label, error, className = '', autoExpand = false, ...props }: FormTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const adjustHeight = () => {
        const textarea = textareaRef.current
        if (textarea && autoExpand) {
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
        }
    }

    useEffect(() => {
        if (autoExpand) {
            adjustHeight()
        }
    }, [props.value, autoExpand])

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-bold text-foreground/80 ml-1 mb-1">
                    {label}
                </label>
            )}
            <textarea
                ref={textareaRef}
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
                onInput={(e) => {
                    if (autoExpand) adjustHeight()
                    props.onInput?.(e)
                }}
                {...props}
            />
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
