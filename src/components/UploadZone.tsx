
import React from 'react';
import { UploadCloud, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming shadcn button is available

interface UploadZoneProps {
  onSimulateUpload: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onSimulateUpload }) => {
  return (
    <aside className="w-full md:w-72 lg:w-80 p-6 bg-card rounded-2xl shadow-soft space-y-6 animate-fade-in sticky top-24 h-fit">
      <div className="text-center space-y-3">
        <ImagePlus className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Upload Your Images</h2>
        <p className="text-sm text-muted-foreground">
          Drag & drop a folder, paste images, or connect cloud storage.
        </p>
      </div>
      
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3 hover:border-primary/50 transition-colors">
        <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag files here or</p>
        <Button variant="outline" className="w-full">
          Browse Files
        </Button>
      </div>

      <Button onClick={onSimulateUpload} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        <Zap className="mr-2 h-4 w-4" /> Simulate AI Clustering
      </Button>

      <div className="text-xs text-muted-foreground text-center">
        Supports batch uploads via Google Drive, Dropbox, or Figma plugins (coming soon).
      </div>
    </aside>
  );
};

export default UploadZone;
