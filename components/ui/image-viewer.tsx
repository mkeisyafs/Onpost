"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

export function ImageViewer({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // Update index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsZoomed(false);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  };

  if (!images.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] h-[95vh] p-0 border-0 bg-transparent shadow-none flex flex-col items-center justify-center outline-none"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus:outline-none"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation Buttons - Only show if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70 focus:outline-none hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70 focus:outline-none hover:scale-110 active:scale-95"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}

        {/* Main Image Container */}
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className={cn(
              "max-h-full max-w-full object-contain transition-transform duration-200 select-none",
              isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
            )}
            onClick={() => setIsZoomed(!isZoomed)}
          />
          
          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip (Optional - visible on large screens) */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 z-40 hidden justify-center gap-2 overflow-x-auto px-4 md:flex">
             {/* Simple dots indicator if many images, or thumbnails if few? 
                 Let's stick to simple counter for now to match requested "Facebook scroll" feel which relies on arrows. 
                 The "scroll y" request might imply a vertical gallery but normally full screen viewers are horizontal carousels.
                 If user meant vertical scroll of ALL images, that's a different UI (Tumblr/Pinterest style).
                 "scroll like facebook" usually means horizontal carousel with next/prev.
             */}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
