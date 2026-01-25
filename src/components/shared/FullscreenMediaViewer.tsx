'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface MediaItem {
    type: 'image' | 'video';
    url: string;
}

interface FullscreenMediaViewerProps {
    isOpen: boolean;
    onClose: () => void;
    media: MediaItem[];
    initialIndex?: number;
}

export function FullscreenMediaViewer({ isOpen, onClose, media, initialIndex = 0 }: FullscreenMediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, initialIndex]);

    const handleNext = useCallback(() => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % media.length);
    }, [media.length]);

    const handlePrev = useCallback(() => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    }, [media.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handleNext, handlePrev]);

    if (!isOpen || media.length === 0) return null;

    const currentMedia = media[currentIndex];

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10"
                title="Fechar (Esc)"
            >
                <X size={24} />
            </button>

            {/* Navigation Buttons */}
            {media.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-6 z-[110] p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/5 hidden md:block"
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-6 z-[110] p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/5 hidden md:block"
                    >
                        <ChevronRight size={32} />
                    </button>
                </>
            )}

            {/* Counter */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-md border border-white/10">
                {currentIndex + 1} / {media.length}
            </div>

            {/* Content */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);

                            if (swipe < -swipeConfidenceThreshold) {
                                handleNext();
                            } else if (swipe > swipeConfidenceThreshold) {
                                handlePrev();
                            }
                        }}
                        className="absolute inset-0 flex items-center justify-center p-4 md:p-12 cursor-grab active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {currentMedia.type === 'image' ? (
                            <img
                                src={currentMedia.url}
                                alt=""
                                className="max-w-full max-h-full object-contain select-none pointer-events-none"
                            />
                        ) : (
                            <div 
                                className="relative w-full h-full flex items-center justify-center"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <video
                                    src={currentMedia.url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-full z-10"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
};
