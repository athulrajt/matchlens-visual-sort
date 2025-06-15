import React, { useState } from 'react';
import { ClusterType } from '@/types';
import { MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportImagesToFigma } from '@/lib/figmaExport';
import ClusterColorPalette from './ClusterColorPalette';

interface ClusterCardProps {
  cluster: ClusterType;
  onViewCluster: (cluster: ClusterType) => void;
  onDeleteCluster: (clusterId: string) => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onViewCluster, onDeleteCluster }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const images = cluster.images;
  const imageCount = images.length;

  const handleCardClick = () => {
    onViewCluster(cluster);
  };

  const handleExportToFigma = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportImagesToFigma(cluster.images);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteCluster(cluster.id);
  };

  const handleCopyColor = (e: React.MouseEvent, color: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(color);
    toast.success(`Copied ${color} to clipboard!`);
  };

  const handleShareToPinterest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cluster.images || cluster.images.length === 0) {
      toast.error("This collection has no images to share on Pinterest.");
      return;
    }

    // Pinterest's "Pin It" button can only take one image. We'll use the first one.
    // A full integration to create a board with multiple images would require the Pinterest API and user authentication.
    const firstImage = cluster.images[0];
    const pinDescription = `${cluster.title}${cluster.description ? ` - ${cluster.description}` : ''}`;
    
    // The `url` parameter is the source page of the Pin.
    const sourceUrl = window.location.href;

    const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(sourceUrl)}&media=${encodeURIComponent(firstImage.url)}&description=${encodeURIComponent(pinDescription)}`;
    
    toast.info("Opening Pinterest to create a new Pin...");
    window.open(pinterestUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("clusterId", cluster.id);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedClusterId = e.dataTransfer.getData("clusterId");
    if (draggedClusterId && draggedClusterId !== cluster.id) {
        const event = new CustomEvent('cluster-merge-drop', { 
            detail: { draggedClusterId, targetClusterId: cluster.id } 
        });
        window.dispatchEvent(event);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      draggable="true"
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative bg-card/60 backdrop-blur-md rounded-2xl shadow-soft overflow-hidden transform transition-all hover:shadow-soft-lg hover:-translate-y-1 animate-scale-in flex flex-col cursor-pointer group h-[440px]",
        isDragOver && "outline-dashed outline-2 outline-primary outline-offset-2"
      )}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center pointer-events-none z-20 transition-all duration-300">
          <p className="text-primary-foreground font-semibold bg-primary/80 px-4 py-2 rounded-full shadow-lg">
            Merge with "{cluster.title}"
          </p>
        </div>
      )}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 hover:bg-background/80 text-foreground/70 hover:text-foreground">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
            <DropdownMenuItem onClick={handleExportToFigma}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Export to Figma</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-5 flex-grow flex flex-col">
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

        <div className="mt-auto pt-4 flex items-end justify-between">
          <ClusterColorPalette palette={cluster.palette} onColorCopy={handleCopyColor} />
          <button
            onClick={handleShareToPinterest}
            aria-label="Share on Pinterest"
            title="Share on Pinterest"
            className="transition-transform hover:scale-110"
          >
            <img src="/Pinterest-logo.png?v=2" alt="Share on Pinterest" className="h-6 w-6 object-contain" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClusterCard;
