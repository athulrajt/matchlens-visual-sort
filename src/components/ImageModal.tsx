
import React, { useEffect, useCallback } from 'react';
import { ImageType } from '@/types';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from './ui/button';

interface ImageModalProps {
  images: ImageType[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ images, currentIndex, onClose, onNext, onPrev }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'Escape') onClose();
  }, [onNext, onPrev, onClose]);

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

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-screen-xl max-h-screen p-4 flex items-center justify-center"
        onClick={stopPropagation}
      >
        <img 
          src={currentImage.url} 
          alt={currentImage.alt} 
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-scale-in"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
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
              onClick={onPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Previous image"
            >
              <ArrowLeft className="h-8 w-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
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
