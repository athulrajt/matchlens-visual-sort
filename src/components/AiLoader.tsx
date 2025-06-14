
import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

const AiLoader = ({ className }: { className?: string }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Fetch animation data from the public folder
    fetch('/ailoading.json')
      .then((response) => response.json())
      .then((data) => {
        setAnimationData(data);
      })
      .catch((error) => console.error('Error loading animation data:', error));
  }, []);

  if (!animationData) {
    // Fallback to the original loader while the Lottie file is loading
    return (
      <div className={cn("flex space-x-2 justify-center items-center", className)}>
        <span className="sr-only">Loading...</span>
        <div className="h-4 w-4 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-4 w-4 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-4 w-4 bg-primary rounded-full animate-bounce"></div>
      </div>
    );
  }

  return (
    <div className={cn("w-24 h-24", className)}>
      <Lottie animationData={animationData} loop={true} />
    </div>
  );
};

export default AiLoader;
