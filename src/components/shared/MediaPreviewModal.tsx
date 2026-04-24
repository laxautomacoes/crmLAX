'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface MediaItem {
    type: 'image' | 'video'
    url: string
    label: string
}

interface MediaPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    items: MediaItem[]
    initialIndex?: number
}

export function MediaPreviewModal({ isOpen, onClose, items, initialIndex = 0 }: MediaPreviewModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    useEffect(() => {
        if (isOpen) setCurrentIndex(initialIndex)
    }, [isOpen, initialIndex])

    if (!isOpen || items.length === 0) return null

    const current = items[currentIndex]
    const hasMultiple = items.length > 1

    const goNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev + 1) % items.length)
    }

    const goPrev = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    {/* Download Button */}
                    <a
                        href={current.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        title="Baixar arquivo"
                    >
                        <Download size={20} />
                    </a>

                    {/* Counter */}
                    {hasMultiple && (
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold z-10">
                            {currentIndex + 1} / {items.length}
                        </div>
                    )}

                    {/* Navigation */}
                    {hasMultiple && (
                        <>
                            <button
                                onClick={goPrev}
                                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={goNext}
                                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    {/* Content */}
                    <div
                        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {current.type === 'image' ? (
                            <motion.img
                                key={current.url}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={current.url}
                                alt={current.label}
                                className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
                            />
                        ) : (
                            <motion.video
                                key={current.url}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={current.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                                playsInline
                            />
                        )}
                    </div>

                    {/* Label */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium z-10">
                        {current.label}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
