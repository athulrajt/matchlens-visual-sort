
import React from 'react';
import { Upload, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { UserNav } from './UserNav';
import { Link } from 'react-router-dom';

interface HeaderProps {
  isScrolled?: boolean;
  showTopUploadButton?: boolean;
  onTopUploadClick?: () => void;
  showFilterButton?: boolean;
  onFilterButtonClick?: () => void;
  onSignInClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isScrolled,
  showTopUploadButton,
  onTopUploadClick,
  showFilterButton,
  onFilterButtonClick,
  onSignInClick,
}) => {
  const { user } = useAuth();

  return (
    <header className={cn(
      "py-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-40 animate-fade-in transition-all duration-300",
      isScrolled ? "border-b border-border/60 bg-background/90 backdrop-blur-sm shadow-sm" : "border-b border-transparent"
    )}>
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <img src="/logo.svg" alt="MatchLens Logo" className="h-8 w-8 transition-transform group-hover:scale-110" />
          <h1 className="text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
            MatchLens
          </h1>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {showFilterButton && onFilterButtonClick && user && (
            <Button variant="outline" onClick={onFilterButtonClick} className="hidden sm:inline-flex">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Smart Filters
            </Button>
          )}
          {showTopUploadButton && onTopUploadClick && user && (
            <Button variant="default" onClick={onTopUploadClick} className="bg-gradient-to-r from-orange to-primary text-primary-foreground shadow-lg">
              <Upload className="mr-0 sm:mr-2 h-4 w-4" /> {/* Hide text on very small screens */}
              <span className="hidden sm:inline">Upload More</span>
            </Button>
          )}
          {user ? (
            <UserNav />
          ) : (
            <Button variant="ghost" onClick={onSignInClick}>
              Sign In
            </Button>
          )}
        </div>
      </div>
      {/* Mobile filter button */}
      {showFilterButton && onFilterButtonClick && user && (
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
