
import React from 'react';
import { Zap } from 'lucide-react'; // Example icon

const Header = () => {
  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-40 animate-fade-in">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            MatchLens
          </h1>
        </div>
        <p className="text-md text-muted-foreground hidden sm:block">
          Your mess, beautifully sorted.
        </p>
      </div>
    </header>
  );
};

export default Header;
