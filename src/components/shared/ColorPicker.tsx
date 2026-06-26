'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'

const PRESET_COLORS = [
    { hex: '#3B82F6', label: 'Novo' },
    { hex: '#FACC15', label: 'Atendimento' },
    { hex: '#F59E0B', label: 'Visita' },
    { hex: '#F97316', label: 'Negociação' },
    { hex: '#22C55E', label: 'Venda Feita' },
    { hex: '#EF4444', label: 'Perdido' },
]

interface ColorPickerProps {
    currentColor: string | null
    onColorSelect: (hex: string) => void
    onClose: () => void
    colorPickerRef?: React.RefObject<HTMLDivElement | null>
}

// Helpers
function hexToHsl(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace(/^#/, '')
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    }
}

function hslToHex(h: number, s: number, l: number): string {
    l /= 100
    const a = (s * Math.min(l, 1 - l)) / 100
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

export function ColorPicker({ currentColor, onColorSelect, onClose, colorPickerRef }: ColorPickerProps) {
    const [customColor, setCustomColor] = useState('')
    const [hue, setHue] = useState(200)
    const [saturation, setSaturation] = useState(90)
    const [lightness, setLightness] = useState(50)

    useEffect(() => {
        const initialColor = currentColor || '#FFFFFF'
        const hsl = hexToHsl(initialColor)
        setHue(hsl.h)
        setSaturation(hsl.s || 90)
        setLightness(hsl.l)
        setCustomColor(initialColor)
    }, [currentColor])

    const handleCustomColorSubmit = () => {
        let formattedColor = customColor.trim()
        if (!formattedColor.startsWith('#')) {
            formattedColor = '#' + formattedColor
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(formattedColor)) {
            onColorSelect(formattedColor)
            setCustomColor('')
        }
    }

    return (
        <motion.div
            ref={colorPickerRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-1 w-56 bg-card border border-muted-foreground/30 rounded-lg shadow-xl z-20 p-3"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Cor do Estágio</span>
                <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center cursor-pointer font-bold"
                    title="Voltar"
                >
                    <ArrowLeft size={14} />
                </button>
            </div>

            {/* Bolinhas de cores predefinidas */}
            <div className="grid grid-cols-6 gap-2 mb-3">
                {PRESET_COLORS.map((preset) => (
                    <button
                        key={preset.hex}
                        onClick={() => onColorSelect(preset.hex)}
                        title={preset.label}
                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                        style={{
                            backgroundColor: preset.hex,
                            borderColor: currentColor === preset.hex
                                ? 'var(--foreground)'
                                : preset.hex === '#FFFFFF'
                                    ? 'var(--muted-foreground)'
                                    : preset.hex,
                        }}
                    >
                        {currentColor === preset.hex && (
                            <Check
                                size={12}
                                style={{
                                    color: preset.hex === '#FFFFFF' || preset.hex === '#FACC15'
                                        ? '#404F4F'
                                        : '#FFFFFF'
                                }}
                                strokeWidth={3}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Espectro e Brilho das cores */}
            <div className="border-t border-muted-foreground/30 pt-2 mb-3 space-y-2">
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Matiz
                    </label>
                    <div className="relative w-full h-3 rounded-md overflow-hidden border border-muted-foreground/20">
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={hue}
                            onChange={(e) => {
                                const h = Number(e.target.value)
                                setHue(h)
                                const newHex = hslToHex(h, saturation, lightness)
                                setCustomColor(newHex)
                            }}
                            className="absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent m-0 p-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-webkit-slider-thumb]:shadow-md"
                            style={{
                                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Brilho
                    </label>
                    <div className="relative w-full h-3 rounded-md overflow-hidden border border-muted-foreground/20">
                        <input
                            type="range"
                            min="10"
                            max="90"
                            value={lightness}
                            onChange={(e) => {
                                const l = Number(e.target.value)
                                setLightness(l)
                                const newHex = hslToHex(hue, saturation, l)
                                setCustomColor(newHex)
                            }}
                            className="absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent m-0 p-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-webkit-slider-thumb]:shadow-md"
                            style={{
                                background: `linear-gradient(to right, #000000 0%, hsl(${hue}, 90%, 50%) 50%, #ffffff 100%)`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Input de cor customizada */}
            <div className="border-t border-muted-foreground/30 pt-2">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Cor personalizada
                </label>
                <div className="flex items-center gap-1.5">
                    <div className="relative w-7 h-7 rounded-md border border-muted-foreground/30 shadow-inner flex-shrink-0 overflow-hidden">
                        <input
                            type="color"
                            value={customColor.startsWith('#') ? customColor : '#' + customColor || currentColor || '#FFFFFF'}
                            onChange={(e) => {
                                const hex = e.target.value
                                setCustomColor(hex)
                                const hsl = hexToHsl(hex)
                                setHue(hsl.h)
                                setLightness(hsl.l)
                                setSaturation(hsl.s)
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150"
                        />
                        <div 
                            className="w-full h-full pointer-events-none"
                            style={{ backgroundColor: customColor || currentColor || '#FFFFFF' }}
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="#HEX"
                        value={customColor}
                        onChange={(e) => {
                            const val = e.target.value
                            setCustomColor(val)
                            const formatted = val.startsWith('#') ? val : '#' + val
                            if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
                                const hsl = hexToHsl(formatted)
                                setHue(hsl.h)
                                setLightness(hsl.l)
                                setSaturation(hsl.s)
                            }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomColorSubmit()}
                        className="flex-1 min-w-0 bg-background border border-muted-foreground/30 rounded-md px-2 py-1 text-[10px] text-foreground outline-none focus:border-primary font-mono"
                    />
                    <button
                        onClick={handleCustomColorSubmit}
                        disabled={!customColor || !/^#[0-9A-Fa-f]{6}$/.test(customColor.startsWith('#') ? customColor : '#' + customColor)}
                        className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-[9px] font-bold hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer"
                    >
                        OK
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
