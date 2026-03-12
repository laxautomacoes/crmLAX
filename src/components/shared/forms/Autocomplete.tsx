'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, X, Check } from 'lucide-react'

interface AutocompleteProps {
    label?: string
    placeholder?: string
    onSelect: (item: any) => void
    onClear: () => void
    fetchItems: (search: string) => Promise<any[]>
    selectedItem: any
    itemToString: (item: any) => string
    itemToId: (item: any) => string
    icon?: any
    error?: string
}

export function Autocomplete({
    label,
    placeholder = 'Buscar',
    onSelect,
    onClear,
    fetchItems,
    selectedItem,
    itemToString,
    itemToId,
    icon: Icon = Search,
    error
}: AutocompleteProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [items, setItems] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 2 && isOpen) {
                setIsLoading(true)
                try {
                    const results = await fetchItems(searchTerm)
                    setItems(results)
                } catch (err) {
                    console.error('Error fetching items:', err)
                } finally {
                    setIsLoading(false)
                }
            } else {
                setItems([])
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchTerm, isOpen, fetchItems])

    return (
        <div className="space-y-1 relative" ref={containerRef}>
            {label && (
                <label className="block text-sm font-bold text-foreground/80 ml-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
                    {label}
                </label>
            )}

            <div className="relative">
                {selectedItem ? (
                    <div className="flex items-center justify-between w-full p-3 bg-muted/40 border border-muted-foreground/30 rounded-lg group">
                        <div className="flex items-center gap-2 truncate">
                            <Icon size={16} className="text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                                {itemToString(selectedItem)}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onClear}
                            className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-destructive"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-card border border-muted-foreground/30 rounded-lg text-sm text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all placeholder:text-muted-foreground/50"
                            placeholder={placeholder}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setIsOpen(true)
                            }}
                            onFocus={() => setIsOpen(true)}
                        />
                    </>
                )}

                {isOpen && !selectedItem && searchTerm.length >= 2 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {isLoading ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2 font-medium italic">
                                <Loader2 size={12} className="animate-spin" />
                                Buscando
                            </div>
                        ) : items.length > 0 ? (
                            items.map((item) => (
                                <button
                                    key={itemToId(item)}
                                    type="button"
                                    onClick={() => {
                                        onSelect(item)
                                        setIsOpen(false)
                                        setSearchTerm('')
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between group"
                                >
                                    <span className="font-medium text-foreground/80 group-hover:text-foreground truncate transition-colors">
                                        {itemToString(item)}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-xs text-muted-foreground font-medium italic">
                                Nenhum resultado encontrado.
                            </div>
                        )}
                    </div>
                )}
            </div>
            {error && <span className="text-xs text-red-500 ml-1 mt-1">{error}</span>}
        </div>
    )
}
