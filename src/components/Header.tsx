import React, { useState, useEffect, useRef } from 'react';
import { Upload, SlidersHorizontal, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { UserNav } from './UserNav';
import { Link } from 'react-router-dom';
import { Input } from './ui/input';

interface HeaderProps {
  isScrolled?: boolean;
  showTopUploadButton?: boolean;
  onTopUploadClick?: () => void;
  showFilterButton?: boolean;
  onFilterButtonClick?: () => void;
  onSignInClick?: () => void;
  showSearchButton?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  isScrolled,
  showTopUploadButton,
  onTopUploadClick,
  showFilterButton,
  onFilterButtonClick,
  onSignInClick,
  showSearchButton,
  searchTerm,
  onSearchTermChange,
}) => {
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        if (!searchTerm) {
          setIsSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchTerm]);

  return (
    <header className={cn(
      "py-4 px-4 sm:px-6 lg:px-8 sticky top-0 z-40 animate-fade-in transition-all duration-300",
      isScrolled ? "border-b border-border/60 bg-background/90 backdrop-blur-sm shadow-sm" : "border-b border-transparent"
    )}>
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <img src="/logo.svg" alt="MatchLens Logo" className="h-8 w-8 transition-transform group-hover:scale-110" />
          <h1 className="text-xl font-bold leading-none sm:leading-tight text-foreground transition-colors group-hover:text-primary">
            MatchLens
          </h1>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {showSearchButton && user && (
            <div ref={searchContainerRef} className="flex items-center">
              {isSearchOpen ? (
                <div className="relative animate-fade-in">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange?.(e.target.value)}
                    className="h-10 pl-9 pr-9 w-40 sm:w-56"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => onSearchTermChange?.('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                  <Search />
                </Button>
              )}
            </div>
          )}
          {showFilterButton && onFilterButtonClick && user && (
            <Button variant="outline" onClick={onFilterButtonClick} className="hidden sm:inline-flex">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Smart Filters
            </Button>
          )}
          {showTopUploadButton && onTopUploadClick && user && (
            <Button variant="default" onClick={onTopUploadClick} className="hidden sm:inline-flex bg-gradient-to-r from-orange to-primary text-primary-foreground shadow-lg">
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload More</span>
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
