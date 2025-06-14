
import React from 'react';
import AiLoader from './AiLoader';
import { Progress } from './ui/progress';
import ImageUploadCard from './ImageUploadCard';

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
          <Progress value={totalProgress} className="h-2 [&>div]:bg-processing-gradient" />
          <p className="text-sm text-muted-foreground mt-2">{finishedFiles} / {totalFiles} images analyzed</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-row flex-wrap justify-center gap-2 sm:gap-4 max-w-5xl">
          {files.map(file => (
            <div key={file.id} className="w-20">
              <ImageUploadCard
                url={file.url}
                name={file.name}
                progress={file.progress}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessingView;
