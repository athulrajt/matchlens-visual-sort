
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ClusterGrid from '@/components/ClusterGrid';
import FilterSheet from '@/components/FilterSheet'; // Changed from FilterPanel
import ImageGalleryModal from '@/components/ImageGalleryModal';
import { mockClusters } from '@/lib/mockData';
import { ClusterType } from '@/types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

const IndexPage = () => {
  const [clusters, setClusters] = useState<ClusterType[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ClusterType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false); // New state for filter sheet

  const handleSimulateUpload = () => {
    setIsLoading(true);
    setClusters([]); 
    setTimeout(() => {
      setClusters(mockClusters);
      setIsLoading(false);
    }, 1500);
  };

  const handleViewCluster = (cluster: ClusterType) => {
    setSelectedCluster(cluster);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCluster(null);
  };

  const handleClearClusters = () => {
    setClusters([]);
  };

  const isInitialView = clusters.length === 0 && !isLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        showTopUploadButton={!isInitialView}
        onTopUploadClick={handleSimulateUpload}
        showFilterButton={!isInitialView}
        onFilterButtonClick={() => setIsFilterSheetOpen(true)}
      />
      <main className="container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 flex flex-col"> {/* Added flex flex-col */}
        {isInitialView ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            {/* The Header already shows MatchLens name and subtitle */}
            <UploadZone onSimulateUpload={handleSimulateUpload} />
          </div>
        ) : (
          <div className="flex-1"> {/* Removed outer flex md:flex-row, simplified structure */}
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
      <footer className="text-center py-6 border-t border-border/60 text-sm text-muted-foreground">
        MatchLens © {new Date().getFullYear()} - Created with Lovable.
      </footer>
      {selectedCluster && (
        <ImageGalleryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          cluster={selectedCluster}
        />
      )}
      {!isInitialView && (
         <FilterSheet isOpen={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen} />
      )}
    </div>
  );
};

export default IndexPage;
