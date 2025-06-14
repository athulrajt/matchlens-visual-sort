
import React from 'react';
import { cn } from '@/lib/utils';

const AiLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex space-x-2 justify-center items-center", className)}>
    <span className="sr-only">Loading...</span>
    <div className="h-4 w-4 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="h-4 w-4 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="h-4 w-4 bg-primary rounded-full animate-bounce"></div>
  </div>
);

export default AiLoader;
