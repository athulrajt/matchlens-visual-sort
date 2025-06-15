
import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingUploadButtonProps {
  isScrolled: boolean;
  onClick: () => void;
}

const FloatingUploadButton: React.FC<FloatingUploadButtonProps> = ({ isScrolled, onClick }) => {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 h-14 rounded-full shadow-soft-lg transition-all duration-300 ease-in-out flex items-center justify-center bg-gradient-to-r from-orange to-primary text-primary-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isScrolled ? 'w-auto px-6' : 'w-14 p-0'
      )}
      aria-label={isScrolled ? 'Upload More' : 'Upload'}
    >
      <Upload className={cn("h-7 w-7 transition-all duration-300", isScrolled && "mr-2")} />
      <span className={cn(
        "transition-all duration-300 ease-in-out font-semibold whitespace-nowrap overflow-hidden",
        isScrolled ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'
      )}>
        Upload More
      </span>
    </Button>
  );
};

export default FloatingUploadButton;
