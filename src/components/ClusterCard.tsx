
import React from 'react';
import { ClusterType } from '@/types';
import { Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClusterCardProps {
  cluster: ClusterType;
  onViewCluster: (cluster: ClusterType) => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onViewCluster }) => {
  const representativeImages = cluster.images.slice(0, 3);

  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden transform transition-all hover:shadow-soft-lg hover:-translate-y-1 animate-scale-in flex flex-col">
      <div className="p-5 flex-grow">
        <h3 className="text-xl font-semibold text-foreground mb-2">{cluster.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden">
          {cluster.description || `${cluster.images.length} images in this cluster.`}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4 h-24">
          {representativeImages.map((image, index) => (
            <div key={image.id} className={`relative rounded-lg overflow-hidden ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
              <img 
                src={image.url} 
                alt={image.alt} 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          ))}
          {cluster.images.length > 3 && representativeImages.length < 3 && (
             // Fill remaining grid cells if less than 3 images but more than 0
            Array.from({ length: 3 - representativeImages.length }).map((_, i) => (
              <div key={`placeholder-${i}`} className="bg-muted rounded-lg"></div>
            ))
          )}
           {cluster.images.length > 3 && representativeImages.length === 3 && (
            <div className="bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
              +{cluster.images.length - 2} more
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Dominant Colors:</p>
          <div className="flex space-x-1 h-3">
            {cluster.palette.map((color, index) => (
              <div
                key={index}
                className="flex-1 rounded-sm"
                style={{ backgroundColor: color }}
                title={color}
              ></div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="border-t border-border/60 p-4 bg-background/50 flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={() => onViewCluster(cluster)} className="text-primary hover:text-primary/80">
          <Eye className="mr-2 h-4 w-4" /> View All
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>
    </div>
  );
};

export default ClusterCard;
