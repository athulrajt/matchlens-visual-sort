import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import FilterSheet from '@/components/FilterSheet';
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

const IndexPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { clusters, isLoadingClusters, createClusters, deleteCluster, clearClusters, clearClustersMutation } = useClusters();
  
  const [activeFilters, setActiveFilters] = useState<{ tags: string[] }>({ tags: [] });

  const { isProcessing, isClustering, processingFiles, fileInputRef, handleUploadClick, handleFileChange } = useImageUploader({
    createClusters,
    onUploadStart: () => setActiveFilters({ tags: [] }),
    onUploadEnd: () => {},
  });

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
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
      setActiveFilters({ tags: [] });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clusters.forEach(cluster => cluster.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [clusters]);

  const filteredClusters = useMemo(() => {
    if (activeFilters.tags.length === 0) return clusters;
    const lowerCaseFilterTags = activeFilters.tags.map(t => t.toLowerCase());
    return clusters.filter(cluster => 
      cluster.tags?.some(clusterTag => lowerCaseFilterTags.includes(clusterTag.toLowerCase()))
    );
  }, [clusters, activeFilters]);

  const handleViewCluster = (cluster: ClusterType) => {
    navigate(`/cluster/${cluster.id}`, { state: { cluster } });
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
        onSignInClick={() => setIsAuthModalOpen(true)}
      />
      <main className="container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        {isProcessing ? (
          <ProcessingView files={processingFiles} isClustering={isClustering} />
        ) : isInitialView ? (
          <InitialView onUpload={handleUploadClick} />
        ) : (
          <Dashboard
            filteredClusters={filteredClusters}
            allClusters={clusters}
            hasActiveFilters={activeFilters.tags.length > 0}
            onViewCluster={handleViewCluster}
            onDeleteCluster={deleteCluster}
            onClearAll={clearClusters}
            onAdjustFilters={() => setIsFilterSheetOpen(true)}
            isClearing={clearClustersMutation.isPending}
          />
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
           onApplyFilters={setActiveFilters}
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
    </div>
  );
};

export default IndexPage;
