
import React, { useEffect, useCallback, useState } from 'react';
import { ImageType } from '@/types';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ImageModalProps {
  images: ImageType[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ images, currentIndex, onClose, onNext, onPrev }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [direction, setDirection] = useState<'in' | 'next' | 'prev'>('in');

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Animation duration
  }, [onClose]);

  const wrappedOnNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection('next');
    onNext();
  }, [onNext]);

  const wrappedOnPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection('prev');
    onPrev();
  }, [onPrev]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') wrappedOnNext();
    if (e.key === 'ArrowLeft') wrappedOnPrev();
    if (e.key === 'Escape') handleClose();
  }, [wrappedOnNext, wrappedOnPrev, handleClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  // Stop propagation to prevent clicks on arrows/image from closing modal
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const imageAnimationClass = isClosing
    ? 'animate-scale-out'
    : {
        'in': 'animate-scale-in',
        'next': 'animate-slide-in-from-right',
        'prev': 'animate-slide-in-from-left',
      }[direction];

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/90 z-50 flex items-center justify-center",
        isClosing ? "animate-fade-out" : "animate-fade-in"
      )}
      onClick={handleClose}
    >
      <div 
        className="relative max-w-screen-xl max-h-screen p-4 flex items-center justify-center"
        onClick={stopPropagation}
      >
        <img 
          key={currentIndex}
          src={currentImage.url} 
          alt={currentImage.alt} 
          className={cn(
            "max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl",
            imageAnimationClass
          )}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close image viewer"
        >
          <X className="h-6 w-6" />
        </Button>

        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={wrappedOnPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Previous image"
            >
              <ArrowLeft className="h-8 w-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={wrappedOnNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Next image"
            >
              <ArrowRight className="h-8 w-8" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
