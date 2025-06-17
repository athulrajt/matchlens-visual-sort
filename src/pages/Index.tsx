import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import { ClusterType } from '@/types';
import { cn } from '@/lib/utils';
import ProcessingView from '@/components/ProcessingView';
import { useAuth } from '@/contexts/AuthProvider';
import { useClusters } from '@/hooks/useClusters';
import { useImageUploader } from '@/hooks/useImageUploader';
import InitialView from '@/components/InitialView';
import Dashboard from '@/components/Dashboard';
import { AuthModal } from '@/components/AuthModal';
import { useIsMobile } from '@/hooks/use-mobile';
import FloatingUploadButton from '@/components/FloatingUploadButton';
import FilterModal from '@/components/FilterModal';
import { getPaletteMoods } from '@/lib/colorUtils';
import MergeClusterDialog from '@/components/MergeClusterDialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

const IndexPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { clusters, isLoadingClusters, createClusters, deleteCluster, clearClusters, clearClustersMutation, mergeClusters, mergeClustersMutation } = useClusters();
  
  const [activeFilters, setActiveFilters] = useState<{ tags: string[]; colors: string[] }>({ tags: [], colors: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [mergingClustersInfo, setMergingClustersInfo] = useState<{ c1: ClusterType, c2: ClusterType } | null>(null);
  const [showMergeGuide, setShowMergeGuide] = useState(false);

  const { isProcessing, isClustering, processingFiles, fileInputRef, handleUploadClick, handleFileChange } = useImageUploader({
    createClusters,
    onUploadStart: () => {
      setActiveFilters({ tags: [], colors: [] });
      setSearchTerm('');
    },
    onUploadEnd: () => {},
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.state?.clearFilters) {
      setActiveFilters({ tags: [], colors: [] });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const handleMergeDrop = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { draggedClusterId, targetClusterId } = customEvent.detail;
        
        const cluster1 = clusters.find(c => c.id === draggedClusterId);
        const cluster2 = clusters.find(c => c.id === targetClusterId);

        if (cluster1 && cluster2) {
            setMergingClustersInfo({ c1: cluster1, c2: cluster2 });
        }
    };

    window.addEventListener('cluster-merge-drop', handleMergeDrop);

    return () => {
        window.removeEventListener('cluster-merge-drop', handleMergeDrop);
    };
  }, [clusters]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clusters.forEach(cluster => cluster.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [clusters]);

  const filteredClusters = useMemo(() => {
    let filtered = clusters;

    // Tag filtering
    if (activeFilters.tags.length > 0) {
      const lowerCaseFilterTags = activeFilters.tags.map(t => t.toLowerCase());
      filtered = filtered.filter(cluster => 
        cluster.tags?.some(clusterTag => lowerCaseFilterTags.includes(clusterTag.toLowerCase()))
      );
    }
    
    // Color filtering
    if (activeFilters.colors.length > 0) {
        filtered = filtered.filter(cluster => {
            if (!cluster.palette || cluster.palette.length === 0) return false;
            const moods = getPaletteMoods(cluster.palette);
            return activeFilters.colors.some(colorFilter => moods.includes(colorFilter));
        });
    }

    return filtered;
  }, [clusters, activeFilters]);

  const searchedClusters = useMemo(() => {
    if (!searchTerm) {
      return filteredClusters;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return filteredClusters.filter(cluster =>
      cluster.title.toLowerCase().includes(lowercasedTerm) ||
      (cluster.description && cluster.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [filteredClusters, searchTerm]);

  useEffect(() => {
    // Show guide only if there are clusters and the user hasn't seen it before (using localStorage for persistence)
    const hasSeen = localStorage.getItem('hasSeenMergeGuide');
    if (!hasSeen && searchedClusters.length > 0) {
      setShowMergeGuide(true);
    }
  }, [searchedClusters.length]);

  const handleDismissMergeGuide = () => {
    localStorage.setItem('hasSeenMergeGuide', 'true');
    setShowMergeGuide(false);
  };

  const handleViewCluster = (cluster: ClusterType) => {
    navigate(`/cluster/${cluster.id}`, { state: { cluster } });
  };

  const handleApplyFilters = (newFilters: { tags: string[]; colors: string[] }) => {
    setActiveFilters(newFilters);
    // Clearing search on applying filters for a cleaner experience
    setSearchTerm(''); 
    setIsFilterModalOpen(false);
  };

  const handleClearFiltersAndRefresh = () => {
    // As requested, this will clear filters by reloading the page.
    window.location.reload();
  };

  const handleConfirmMerge = (newName: string) => {
    if (!mergingClustersInfo) return;

    // The dragged cluster (c1) is merged into the target cluster (c2).
    // Our hook expects `cluster1Id` to be the destination and `cluster2Id` to be the source.
    mergeClusters({
      cluster1Id: mergingClustersInfo.c2.id,
      cluster2Id: mergingClustersInfo.c1.id,
      newName: newName,
    });
    
    setMergingClustersInfo(null);
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
        onFilterButtonClick={() => setIsFilterModalOpen(true)}
        onSignInClick={() => setIsAuthModalOpen(true)}
        showSearchButton={!isInitialView}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />
      <main className="container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        {isProcessing ? (
          <ProcessingView files={processingFiles} isClustering={isClustering} />
        ) : isInitialView ? (
          <InitialView onUpload={handleUploadClick} />
        ) : (
          <Dashboard
            filteredClusters={searchedClusters}
            allClusters={clusters}
            hasActiveFilters={activeFilters.tags.length > 0 || activeFilters.colors.length > 0}
            onViewCluster={handleViewCluster}
            onDeleteCluster={deleteCluster}
            onClearAll={clearClusters}
            onAdjustFilters={() => setIsFilterModalOpen(true)}
            isClearing={clearClustersMutation.isPending}
            searchTerm={searchTerm}
            onClearSearch={() => setSearchTerm('')}
          />
        )}
      </main>
      <footer className={cn(
        "text-center py-6 border-t text-sm text-muted-foreground transition-all duration-300",
        isScrolled ? "border-border/60 bg-background/80 backdrop-blur-sm" : "bg-transparent border-transparent"
      )}>
        MatchLens © {new Date().getFullYear()} - Created with Lovable.
      </footer>
      
      {mergingClustersInfo && (
        <MergeClusterDialog 
          isOpen={!!mergingClustersInfo}
          onOpenChange={(isOpen) => !isOpen && setMergingClustersInfo(null)}
          cluster1={mergingClustersInfo.c1}
          cluster2={mergingClustersInfo.c2}
          onConfirmMerge={handleConfirmMerge}
          isMerging={mergeClustersMutation.isPending}
        />
      )}

      {!isInitialView && (
         <FilterModal 
           isOpen={isFilterModalOpen} 
           onOpenChange={setIsFilterModalOpen}
           allTags={allTags}
           activeFilters={activeFilters}
           onApplyFilters={handleApplyFilters}
           onClear={handleClearFiltersAndRefresh}
         />
      )}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onOpenChange={setIsAuthModalOpen}
        onSuccess={() => setIsAuthModalOpen(false)}
      />
      {user && !isInitialView && isMobile && (
        <FloatingUploadButton isScrolled={isScrolled} onClick={handleUploadClick} />
      )}
      {showMergeGuide && (
        <div 
          className="fixed bottom-8 right-8 max-w-sm z-50 p-3 pr-10 rounded-xl bg-yellow-100/80 border border-yellow-200/80 text-yellow-900 text-sm animate-fade-in shadow-soft flex items-start gap-2.5"
        >
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Tip:</strong> You can merge collections by dragging one on top of another.
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismissMergeGuide}
            className="absolute top-1/2 -translate-y-1/2 right-1 h-8 w-8 text-yellow-900/70 hover:text-yellow-900 hover:bg-yellow-200/50 rounded-full"
            aria-label="Dismiss tip"
            >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default IndexPage;
