import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ClusterGrid from '@/components/ClusterGrid';
import FilterSheet from '@/components/FilterSheet';
import { ClusterType } from '@/types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { clusterImages } from '@/lib/ai';

const IndexPage = () => {
  const [clusters, setClusters] = useState<ClusterType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to clean up object URLs on unmount or when clusters change
  useEffect(() => {
    return () => {
      clusters.forEach(cluster => {
        cluster.images.forEach(image => URL.revokeObjectURL(image.url));
      });
    };
  }, [clusters]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      setClusters([]);
      toast.info("Warming up the AI... This may take a moment on first use.", {
        duration: 8000,
      });
      try {
        const newClusters = await clusterImages(Array.from(files));
        setClusters(newClusters);
        if (newClusters.length > 0) {
          toast.success(`Successfully created ${newClusters.length} smart cluster(s)!`);
        } else {
          toast.warning("No images were processed. Please try again.");
        }
      } catch (error) {
        console.error("Error clustering images:", error);
        toast.error("Oops! Something went wrong while clustering images.");
      } finally {
        setIsLoading(false);
      }
    }
    // Reset file input to allow re-uploading the same files
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleViewCluster = (cluster: ClusterType) => {
    navigate(`/cluster/${cluster.id}`, { state: { cluster } });
  };

  const handleClearClusters = () => {
    // Revoke object URLs to prevent memory leaks
    clusters.forEach(cluster => {
        cluster.images.forEach(image => URL.revokeObjectURL(image.url));
    });
    setClusters([]);
    toast.info("All clusters have been cleared.");
  };

  const isInitialView = clusters.length === 0 && !isLoading;

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />
      <Header 
        isScrolled={isScrolled}
        showTopUploadButton={!isInitialView}
        onTopUploadClick={handleUploadClick}
        showFilterButton={!isInitialView}
        onFilterButtonClick={() => setIsFilterSheetOpen(true)}
      />
      <main className="container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        {isInitialView ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <h1 className="text-[54px] font-bold tracking-tight mb-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Drop. <span className="bg-gradient-to-r from-orange to-red bg-clip-text text-transparent">Sort.</span> <span className="bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">Discover.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Your mess, beautifully sorted.
            </p>
            <UploadZone onUpload={handleUploadClick} />
          </div>
        ) : (
          <div className="flex-1 w-full">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-lg text-muted-foreground">AI is thinking... Clustering images...</p>
              </div>
            ) : (
              <ClusterGrid clusters={clusters} onViewCluster={handleViewCluster} />
            )}
            {clusters.length > 0 && !isLoading && (
               <div className="mt-8 text-center">
                <Button variant="outline" onClick={handleClearClusters} className="text-destructive hover:text-destructive/80 hover:border-destructive/50">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear All Clusters
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
      <footer className={cn(
        "text-center py-6 border-t text-sm text-muted-foreground transition-all duration-300",
        isScrolled ? "border-border/60 bg-background/80 backdrop-blur-sm" : "bg-transparent border-transparent"
      )}>
        MatchLens © {new Date().getFullYear()} - Created with Lovable.
      </footer>
      {!isInitialView && (
         <FilterSheet isOpen={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen} />
      )}
    </div>
  );
};

export default IndexPage;
