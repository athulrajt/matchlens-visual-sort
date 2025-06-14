import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ClusterGrid from '@/components/ClusterGrid';
import FilterSheet from '@/components/FilterSheet';
import { ClusterType, ImageType } from '@/types';
import { Button } from '@/components/ui/button';
import { Trash2, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { clusterImages } from '@/lib/ai';
import ProcessingView, { ProcessingFile } from '@/components/ProcessingView';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const IndexPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: clusters = [], isLoading: isLoadingClusters, refetch: refetchClusters } = useQuery<ClusterType[]>({
    queryKey: ['clusters', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('clusters')
        .select(`
          id,
          title,
          description,
          tags,
          palette,
          images (
            id,
            image_path,
            alt
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to fetch your collections.');
        console.error(error);
        return [];
      }

      return data.map(c => ({
        ...c,
        images: c.images.map(img => {
            const publicUrlResult = supabase.storage.from('cluster-images').getPublicUrl(img.image_path);
            return {
                id: img.id,
                alt: img.alt,
                url: publicUrlResult.data.publicUrl,
            };
        })
      }));
    },
    enabled: !!user,
  });

  const [filteredClusters, setFilteredClusters] = useState<ClusterType[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ tags: string[] }>({ tags: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!user) {
      toast.info("Please sign in to create a collection.");
      navigate('/auth');
      return;
    }
    fileInputRef.current?.click();
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!user) throw new Error("You must be logged in to upload images.");

      const { count, error: countError } = await supabase
        .from('clusters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (countError) throw countError;
      if (count !== null && count >= 15) {
        throw new Error("You've reached the limit of 15 collections. Please delete some to continue.");
      }

      const blobUrlToFileMap = new Map<string, File>();
      const filesForAI = files.map(file => {
        const url = URL.createObjectURL(file);
        blobUrlToFileMap.set(url, file);
        return file;
      });

      const onProgress = ({ imageId, progress }: { imageId: string, progress: number }) => {
        setProcessingFiles(prevFiles => prevFiles.map(f => f.id === imageId ? { ...f, progress } : f));
      };
      const beforeClustering = () => setIsClustering(true);

      const newClustersFromAI = await clusterImages(filesForAI, onProgress, beforeClustering);

      if (newClustersFromAI.length === 0) {
        throw new Error("The AI could not create any clusters from your images.");
      }

      toast.info(`Saving ${newClustersFromAI.length} new collection(s) to your account...`);

      for (const cluster of newClustersFromAI) {
        const { data: newCluster, error: clusterError } = await supabase.from('clusters').insert({
          user_id: user.id,
          title: cluster.title,
          description: cluster.description,
          tags: cluster.tags,
          palette: cluster.palette,
        }).select().single();

        if (clusterError) throw clusterError;

        for (const image of cluster.images) {
          const file = blobUrlToFileMap.get(image.url);
          if (!file) continue;

          const imagePath = `${user.id}/${newCluster.id}/${file.name}`;
          const { error: uploadError } = await supabase.storage.from('cluster-images').upload(imagePath, file);

          if (uploadError) {
            console.error('Failed to upload image', uploadError);
            continue;
          }

          await supabase.from('images').insert({
            cluster_id: newCluster.id,
            user_id: user.id,
            image_path: imagePath,
            alt: file.name,
          });
          URL.revokeObjectURL(image.url);
        }
      }
      return newClustersFromAI;
    },
    onSuccess: (newClusters) => {
      toast.success(`Successfully created and saved ${newClusters.length} new smart collection(s)!`);
      queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
    },
    onError: (error: Error) => {
      toast.error("An error occurred", { description: error.message });
    },
    onSettled: () => {
      setIsProcessing(false);
      setIsClustering(false);
      setProcessingFiles([]);
    }
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!user) {
        toast.error("You must be logged in.");
        navigate('/auth');
        return;
    }

    const allFiles = Array.from(files);
    const maxSizeInBytes = 500 * 1024; // 500kb

    const validFiles = allFiles.filter(file => {
      if (file.size > maxSizeInBytes) {
        toast.warning(`Skipping "${file.name}"`, { description: `File is larger than 500kb.` });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
        if(allFiles.length > 0) toast.error("All selected files were over the 500kb size limit.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    const newFilesForUI = validFiles.map((file, i) => ({
      id: `${file.name}-${i}`,
      url: URL.createObjectURL(file),
      name: file.name,
      progress: 0,
    }));

    setProcessingFiles(newFilesForUI);
    setFilteredClusters([]);
    setActiveFilters({ tags: [] });
    setIsProcessing(true);
    setIsClustering(false);

    toast.info("Warming up the AI... This may take a moment.");
    uploadMutation.mutate(validFiles);

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleViewCluster = (cluster: ClusterType) => {
    navigate(`/cluster/${cluster.id}`, { state: { cluster } });
  };

  const clearClustersMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not found");
      
      // We need to delete images from storage first
      for (const cluster of clusters) {
        const imagePaths = cluster.images.map(img => `${user.id}/${cluster.id}/${img.alt}`);
        if(imagePaths.length > 0) {
            const { error: storageError } = await supabase.storage.from('cluster-images').remove(imagePaths);
            if(storageError) console.error("Could not delete some images from storage", storageError);
        }
      }

      const { error } = await supabase.from('clusters').delete().eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.info("All your collections have been cleared.");
      queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to clear collections", { description: error.message });
    }
  });

  const handleClearClusters = () => {
    if (!user) return;
    clearClustersMutation.mutate();
  };

  const handleApplyFilters = (filters: { tags: string[] }) => {
    setActiveFilters(filters);
  };

  const isInitialView = clusters.length === 0 && !isProcessing && !isLoadingClusters;

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
        {isProcessing ? (
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
            
            {clusters.length > 0 && !isProcessing && (
               <div className="mt-8 text-center">
                <Button variant="outline" onClick={handleClearClusters} className="text-destructive hover:text-destructive/80 hover:border-destructive/50" disabled={clearClustersMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> 
                  {clearClustersMutation.isPending ? 'Clearing...' : 'Clear All Collections'}
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
      {!isInitialView && user && (
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
