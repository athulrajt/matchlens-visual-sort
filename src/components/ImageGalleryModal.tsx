
import React from 'react';
import { ClusterType, ImageType } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { X, Download } from 'lucide-react';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cluster: ClusterType | null;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, cluster }) => {
  if (!cluster) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{cluster.title}</DialogTitle>
          <DialogDescription>
            {cluster.description || `${cluster.images.length} images in this cluster.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {cluster.images.map((image: ImageType) => (
              <div key={image.id} className="aspect-square rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <img 
                  src={image.url} 
                  alt={image.alt} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/50">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Download className="mr-2 h-4 w-4" /> Export Cluster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGalleryModal;
