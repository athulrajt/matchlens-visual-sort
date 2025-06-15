
import React from 'react';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { XCircle } from 'lucide-react';

interface ImageUploadCardProps {
  url: string;
  name: string;
  progress: number;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({ url, name, progress }) => (
  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted shadow-md animate-fade-in">
    <img src={url} alt={name} className="h-full w-full object-cover" />
    {progress < 100 && progress !== -1 && (
      <div className="absolute inset-0 bg-black/30" />
    )}
    {progress === -1 && (
      <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center" title="Processing failed">
        <XCircle className="h-1/3 w-1/3 text-destructive-foreground" />
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
      <p className="truncate text-xs font-medium">{name}</p>
      <Progress
        value={progress === -1 ? 100 : progress}
        className={cn("mt-1 h-1.5 w-full [&>div]:bg-primary", { "[&>div]:bg-destructive": progress === -1 })}
        indicatorClassName="transition-none"
      />
    </div>
  </div>
);

export default React.memo(ImageUploadCard);
