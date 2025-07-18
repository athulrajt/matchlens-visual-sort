
import React from 'react';

interface UploadZoneProps {
  onUpload: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
  return (
    <div 
      onClick={onUpload}
      style={{ animationDelay: '0.4s' }}
      className="w-full max-w-xl text-center animate-fade-in rounded-4xl p-10 sm:p-16 bg-card/50 backdrop-blur-sm shadow-soft space-y-4 cursor-pointer border border-transparent hover:border-primary/50 hover:bg-card/60 transition-all duration-300"
    >
      <img src="/Imageup.svg" alt="Upload Icon" className="mx-auto h-12 w-12 text-foreground/60" />
      <h2 className="text-2xl font-semibold text-foreground">Upload your images</h2>
      <p className="text-md text-muted-foreground">
        Drag & drop a folder, paste images, or connect cloud storage.
      </p>
    </div>
  );
};

export default UploadZone;
