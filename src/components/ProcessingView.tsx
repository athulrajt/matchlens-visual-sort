
import React from 'react';
import AiLoader from './AiLoader';
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
      <Progress value={progress === -1 ? 100 : progress} className={cn("mt-1 h-1.5 w-full [&>div]:bg-primary", { "[&>div]:bg-destructive": progress === -1 })} />
    </div>
  </div>
);

export interface ProcessingFile {
  id: string;
  url: string;
  name: string;
  progress: number;
}

interface ProcessingViewProps {
  files: ProcessingFile[];
  isClustering: boolean;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ files, isClustering }) => {
  const totalFiles = files.length;
  const finishedFiles = files.filter(f => f.progress === 100 || f.progress === -1).length;
  const totalProgress = totalFiles > 0 ? (finishedFiles / totalFiles) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8 animate-fade-in w-full">
      <AiLoader className="mb-4" />
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        {isClustering ? 'Grouping your images...' : 'Analyzing your images...'}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {isClustering
          ? 'The AI is finding the best way to group your visually similar images. Almost there!'
          : 'Our AI is extracting features and tags from each image. Please be patient, this can take a moment.'}
      </p>

      {files.length > 0 && !isClustering && (
         <div className="w-full max-w-4xl mx-auto mb-8">
          <Progress value={totalProgress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">{finishedFiles} / {totalFiles} images analyzed</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-4 max-w-5xl">
          {files.map(file => (
            <ImageUploadCard
              key={file.id}
              url={file.url}
              name={file.name}
              progress={file.progress}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessingView;
