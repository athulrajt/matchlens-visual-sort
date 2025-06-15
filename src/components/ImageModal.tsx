import React, { useEffect, useCallback, useState } from 'react';
import { ImageType, ClusterType } from '@/types';
import { ArrowLeft, ArrowRight, X, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';


interface ImageModalProps {
  images: ImageType[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  allClusters?: ClusterType[];
  currentClusterId?: string;
  onMoveImage?: (image: ImageType, newClusterId: string, callback: () => void) => void;
  isMovingImage?: boolean;
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  images, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrev,
  allClusters,
  currentClusterId,
  onMoveImage,
  isMovingImage
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [direction, setDirection] = useState<'in' | 'next' | 'prev'>('in');
  const isMobile = useIsMobile();
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Animation duration
  }, [onClose]);

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
  };

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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || images.length <= 1) return;
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const SWIPE_THRESHOLD = 50; // Min swipe distance

    if (diff > SWIPE_THRESHOLD) {
      wrappedOnNext();
    } else if (diff < -SWIPE_THRESHOLD) {
      wrappedOnPrev();
    }
    setTouchStart(null);
  };

  const handleMoveImage = useCallback((newClusterId: string) => {
    if (onMoveImage && images[currentIndex]) {
      onMoveImage(images[currentIndex], newClusterId, handleClose);
    }
  }, [onMoveImage, images, currentIndex, handleClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const currentImage = images[currentIndex];
  const otherClusters = allClusters?.filter(c => c.id !== currentClusterId) || [];

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
        "fixed inset-0 bg-black/80 z-50 flex items-center justify-center",
        isClosing ? "animate-fade-out" : "animate-fade-in"
      )}
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCloseClick}
        className="absolute top-4 right-4 text-white/70 hover:bg-white/10 hover:text-white transition-colors z-50"
        aria-label="Close image viewer"
      >
        <X className="h-6 w-6" />
      </Button>

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

        {images.length > 1 && !isMobile && (
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

        {/* --- Actions Bar --- */}
        {onMoveImage && allClusters && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full p-1 sm:p-2 flex items-center gap-2 z-50 animate-fade-in">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-white/80 hover:bg-white/10 hover:text-white h-10 px-3 sm:h-auto sm:px-4" 
                  disabled={isMovingImage}
                  aria-label="Move image to another collection"
                >
                  {isMovingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRightLeft className="h-5 w-5" />}
                  <span className="ml-2 hidden sm:inline">Move</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()} side="top" align="center">
                <DropdownMenuLabel>Move to another collection</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {otherClusters.length > 0 ? (
                  otherClusters.map(cluster => (
                    <DropdownMenuItem key={cluster.id} onClick={() => handleMoveImage(cluster.id)}>
                      {cluster.title}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No other collections</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
