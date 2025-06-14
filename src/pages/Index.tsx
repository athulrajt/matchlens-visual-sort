import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ClusterGrid from '@/components/ClusterGrid';
import FilterSheet from '@/components/FilterSheet';
import { ClusterType } from '@/types';
import { Button } from '@/components/ui/button';
import { Trash2, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { clusterImages } from '@/lib/ai';
import ProcessingView, { ProcessingFile } from '@/components/ProcessingView';

const IndexPage = () => {
  const [clusters, setClusters] = useState<ClusterType[]>(() => {
    try {
      const storedClusters = sessionStorage.getItem('clusters');
      return storedClusters ? JSON.parse(storedClusters) : [];
    } catch (error) {
      console.error("Error reading clusters from session storage", error);
      return [];
    }
  });
  const [filteredClusters, setFilteredClusters] = useState<ClusterType[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ tags: string[] }>({ tags: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [isClustering, setIsClustering] = useState(false);


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

  useEffect(() => {
    try {
      if (clusters.length > 0) {
        sessionStorage.setItem('clusters', JSON.stringify(clusters));
      } else {
        sessionStorage.removeItem('clusters');
      }
    } catch (error) {
      console.error("Error writing clusters to session storage", error);
    }
  }, [clusters]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clusters.forEach(cluster => {
      cluster.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [clusters]);

  useEffect(() => {
    if (activeFilters.tags.length === 0) {
      setFilteredClusters(clusters);
      return;
    }
    const lowerCaseFilterTags = activeFilters.tags.map(t => t.toLowerCase());

    const newFilteredClusters = clusters.filter(cluster => {
      if (!cluster.tags || cluster.tags.length === 0) return false;
      return cluster.tags.some(clusterTag => lowerCaseFilterTags.includes(clusterTag.toLowerCase()));
    });

    setFilteredClusters(newFilteredClusters);
  }, [clusters, activeFilters]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        name: file.name,
        progress: 0,
      }));

      setProcessingFiles(newFiles);
      setClusters([]);
      setActiveFilters({ tags: [] }); // Reset filters on new upload
      setIsLoading(true);
      setIsClustering(false);

      toast.info("Warming up the AI... This may take a moment on first use.", {
        duration: 8000,
      });
      try {
        const fileObjects = Array.from(files);
        
        const onProgress = ({ imageId, progress }: { imageId: string, progress: number }) => {
            setProcessingFiles(prevFiles => 
                prevFiles.map(f => f.id === imageId ? { ...f, progress } : f)
            );
        };
        
        const beforeClustering = () => setIsClustering(true);

        const newClusters = await clusterImages(fileObjects, onProgress, beforeClustering);
        
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
        setIsClustering(false);
        // Clean up object URLs for processed files
        newFiles.forEach(f => URL.revokeObjectURL(f.url));
        setProcessingFiles([]);
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

  const handleApplyFilters = (filters: { tags: string[] }) => {
    setActiveFilters(filters);
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
        {isLoading ? (
          <ProcessingView files={processingFiles} isClustering={isClustering} />
        ) : isInitialView ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <h1 className="text-[54px] font-bold tracking-tight mb-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Drop. <span className="bg-gradient-to-r from-orange via-red to-orange bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">Sort.</span> <span className="bg-gradient-to-r from-primary via-violet to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">Discover.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Your mess, beautifully sorted.
            </p>
            <UploadZone onUpload={handleUploadClick} />
          </div>
        ) : (
          <div className="flex-1 w-full animate-fade-in">
            {clusters.length > 0 && filteredClusters.length === 0 && activeFilters.tags.length > 0 ? (
                 <div className="text-center py-16 flex flex-col items-center">
                    <Frown className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground">No clusters match your filters</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm">Try adjusting or clearing your filters to see more results.</p>
                    <Button variant="outline" onClick={() => setIsFilterSheetOpen(true)} className="mt-4">
                        Adjust Filters
                    </Button>
                </div>
            ) : (
                <ClusterGrid clusters={filteredClusters} onViewCluster={handleViewCluster} />
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
         <FilterSheet 
           isOpen={isFilterSheetOpen} 
           onOpenChange={setIsFilterSheetOpen}
           allTags={allTags}
           activeFilters={activeFilters}
           onApplyFilters={handleApplyFilters}
         />
      )}
    </div>
  );
};

export default IndexPage;
