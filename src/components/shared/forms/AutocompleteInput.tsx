'use client'

import { useState, useRef, useEffect } from 'react'

interface AutocompleteInputProps {
    value: string
    onChange: (value: string) => void
    suggestions: string[]
    placeholder: string
    className?: string
}

export function AutocompleteInput({ value, onChange, suggestions, placeholder, className }: AutocompleteInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value.length >= 1) {
            const q = value.toLowerCase()
            const filtered = suggestions.filter(s => s.toLowerCase().includes(q))
            setFilteredSuggestions(filtered)
            setShowSuggestions(filtered.length > 0)
        } else {
            setShowSuggestions(false)
            setFilteredSuggestions([])
        }
    }, [value, suggestions])

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => {
                    if (value.length >= 1 && filteredSuggestions.length > 0) {
                        setShowSuggestions(true)
                    }
                }}
                placeholder={placeholder}
                className={className || "w-full h-9 px-3 bg-foreground/5 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring/50 text-xs"}
            />
            {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-[160px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                    {filteredSuggestions.map((item, idx) => {
                        // Highlight do texto digitado
                        const lowerItem = item.toLowerCase()
                        const lowerQuery = value.toLowerCase()
                        const matchIndex = lowerItem.indexOf(lowerQuery)

                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    onChange(item)
                                    setShowSuggestions(false)
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-foreground/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                                {matchIndex >= 0 ? (
                                    <>
                                        {item.slice(0, matchIndex)}
                                        <span className="font-bold text-secondary">{item.slice(matchIndex, matchIndex + value.length)}</span>
                                        {item.slice(matchIndex + value.length)}
                                    </>
                                ) : item}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
