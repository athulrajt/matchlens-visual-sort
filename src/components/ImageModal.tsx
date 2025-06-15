import React, { useEffect, useCallback, useState } from 'react';
import { ImageType, ClusterType } from '@/types';
import { ArrowLeft, ArrowRight, X, ArrowRightLeft, Loader2, Info } from 'lucide-react';
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
  const [showMoveGuide, setShowMoveGuide] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('hasSeenMoveGuide');
    if (!hasSeen && !isMobile) { // Only show on web
        setShowMoveGuide(true);
    }
  }, [isMobile]);

  const handleDismissMoveGuide = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('hasSeenMoveGuide', 'true');
    setShowMoveGuide(false);
  };

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

  const MoveButtonContent = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "h-10 rounded-full [&_svg]:size-5",
            isMobile 
              ? "text-white/90 bg-transparent hover:bg-white/20 hover:text-white px-4" 
              : "text-white/90 bg-black/20 hover:bg-black/40 hover:text-white px-4"
          )}
          disabled={isMovingImage}
          aria-label="Move image to another collection"
        >
          {isMovingImage ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />}
          <span className="hidden sm:inline ml-2">Move</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()} side={isMobile ? "top" : "bottom"} align="center" className="shadow-lg">
        <DropdownMenuLabel className="text-center">Move to another collection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {otherClusters.length > 0 ? (
          otherClusters.map(cluster => (
            <DropdownMenuItem key={cluster.id} onClick={() => handleMoveImage(cluster.id)} className="justify-center">
              {cluster.title}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="justify-center">No other collections</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        {onMoveImage && allClusters && !isMobile && (
          <div className="relative">
            <MoveButtonContent />
            {showMoveGuide && (
              <div 
                className="absolute top-full right-0 mt-2 w-max max-w-xs p-2.5 rounded-xl bg-yellow-100/95 border border-yellow-200 text-yellow-900 text-xs shadow-lg animate-fade-in flex items-start gap-2"
              >
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>You can move this image to another collection.</span>
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismissMoveGuide}
                    className="absolute top-0.5 right-0.5 h-6 w-6 text-yellow-900/70 hover:text-yellow-900 hover:bg-yellow-200/50 rounded-full"
                    aria-label="Dismiss tip"
                  >
                    <X className="h-3 w-3" />
                  </Button>
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseClick}
          className="h-10 w-10 text-white/70 bg-black/20 hover:bg-black/40 hover:text-white rounded-full transition-colors"
          aria-label="Close image viewer"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

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

        {/* --- Actions Bar for Mobile --- */}
        {onMoveImage && allClusters && isMobile && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange to-primary text-primary-foreground rounded-full flex items-center justify-center p-1 z-50 animate-fade-in">
            <MoveButtonContent />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
