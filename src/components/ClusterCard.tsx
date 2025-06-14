
import React from 'react';
import { ClusterType } from '@/types';
import { MoreHorizontal, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface ClusterCardProps {
  cluster: ClusterType;
  onViewCluster: (cluster: ClusterType) => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onViewCluster }) => {
  const images = cluster.images;
  const imageCount = images.length;

  const handleCardClick = () => {
    onViewCluster(cluster);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Exporting ${cluster.images.length} images from "${cluster.title}"...`);
    // Placeholder for actual export logic
  };

  return (
    <div 
      onClick={handleCardClick}
      className="relative bg-card/60 backdrop-blur-md rounded-2xl shadow-soft overflow-hidden transform transition-all hover:shadow-soft-lg hover:-translate-y-1 animate-scale-in flex flex-col cursor-pointer group"
    >
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 hover:bg-background/80 text-foreground/70 hover:text-foreground">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
            <DropdownMenuItem onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              <span>Export</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-5 flex-grow">
        <h3 className="text-xl font-semibold text-foreground mb-2 pr-8">{cluster.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden">
          {cluster.description || `${cluster.images.length} images in this cluster.`}
        </p>

        <div className="grid grid-cols-2 grid-rows-2 gap-2 mb-4 h-24">
          {imageCount === 1 && (
            <div className="relative rounded-lg overflow-hidden col-span-2 row-span-2">
              <img src={images[0].url} alt={images[0].alt} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          {imageCount > 1 && (
            <>
              <div className="relative rounded-lg overflow-hidden row-span-2">
                <img src={images[0].url} alt={images[0].alt} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="relative rounded-lg overflow-hidden">
                <img src={images[1].url} alt={images[1].alt} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              {imageCount > 2 ? (
                <div className="bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                  +{images.length - 2} more
                </div>
              ) : (
                <div className="bg-muted rounded-lg" />
              )}
            </>
          )}
        </div>
        
        {cluster.tags && cluster.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {cluster.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Dominant Colors:</p>
          <div className="flex items-center space-x-2 h-6">
            {cluster.palette.map((color, index) => (
              <div
                key={index}
                className="h-6 w-6 rounded-full border-2 border-white/50 shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterCard;
