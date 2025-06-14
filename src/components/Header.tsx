import React from 'react';
import { Upload, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  showTopUploadButton?: boolean;
  onTopUploadClick?: () => void;
  showFilterButton?: boolean;
  onFilterButtonClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  showTopUploadButton,
  onTopUploadClick,
  showFilterButton,
  onFilterButtonClick
}) => {
  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-40 animate-fade-in">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/lovable-uploads/c1bd31d2-9913-4298-9c84-42ee5761099c.png" alt="MatchLens Logo" className="h-8 w-8" />
          <h1 className="text-3xl font-bold text-foreground">
            MatchLens
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {showFilterButton && onFilterButtonClick && (
            <Button variant="outline" onClick={onFilterButtonClick} className="hidden sm:inline-flex">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Smart Filters
            </Button>
          )}
          {showTopUploadButton && onTopUploadClick && (
            <Button variant="default" onClick={onTopUploadClick} className="animate-pulse">
              <Upload className="mr-0 sm:mr-2 h-4 w-4" /> {/* Hide text on very small screens */}
              <span className="hidden sm:inline">Upload More</span>
            </Button>
          )}
        </div>
      </div>
      {/* Mobile filter button */}
      {showFilterButton && onFilterButtonClick && (
        <div className="container mx-auto sm:hidden mt-4">
            <Button variant="outline" onClick={onFilterButtonClick} className="w-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Smart Filters
            </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
