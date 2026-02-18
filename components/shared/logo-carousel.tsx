'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselImage {
    id: string;
    title: string | null;
    imageUrl: string;
    sortOrder: number;
}

interface LogoCarouselProps {
    className?: string;
}

export function LogoCarousel({ className = '' }: LogoCarouselProps) {
    const [images, setImages] = useState<CarouselImage[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        fetch('/api/carousel')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setImages(data);
            })
            .catch(console.error);
    }, []);

    const goToNext = useCallback(() => {
        if (images.length <= 1) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
            setIsTransitioning(false);
        }, 300);
    }, [images.length]);

    const goToPrev = useCallback(() => {
        if (images.length <= 1) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
            setIsTransitioning(false);
        }, 300);
    }, [images.length]);

    // Auto-play a cada 4 segundos
    useEffect(() => {
        if (images.length <= 1 || isPaused) return;
        const interval = setInterval(goToNext, 4000);
        return () => clearInterval(interval);
    }, [images.length, isPaused, goToNext]);

    if (images.length === 0) return null;

    return (
        <div
            className={`relative w-full overflow-hidden rounded-xl ${className}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Image container */}
            <div className="relative w-full aspect-[16/7] bg-[hsl(220,20%,10%)] rounded-xl overflow-hidden border border-white/5">
                {images.map((image, index) => (
                    <div
                        key={image.id}
                        className={`absolute inset-0 transition-all duration-500 ease-in-out ${index === currentIndex
                                ? 'opacity-100 scale-100'
                                : 'opacity-0 scale-105'
                            } ${isTransitioning ? 'blur-[1px]' : ''}`}
                    >
                        <Image
                            src={image.imageUrl}
                            alt={image.title || `Slide ${index + 1}`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 448px) 100vw, 448px"
                            priority={index === 0}
                        />
                    </div>
                ))}

                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                {/* Title */}
                {images[currentIndex]?.title && (
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="text-white/90 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                            {images[currentIndex].title}
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.preventDefault(); goToPrev(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                        style={{ opacity: isPaused ? 1 : 0.4 }}
                        aria-label="Anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); goToNext(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                        style={{ opacity: isPaused ? 1 : 0.4 }}
                        aria-label="Próximo"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Dots indicator */}
            {images.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setIsTransitioning(true);
                                setTimeout(() => {
                                    setCurrentIndex(index);
                                    setIsTransitioning(false);
                                }, 300);
                            }}
                            className={`transition-all duration-300 rounded-full ${index === currentIndex
                                    ? 'w-6 h-2 bg-orange-500'
                                    : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'
                                }`}
                            aria-label={`Slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
