import React, { useState, useEffect } from 'react';
import { ClusterType } from '@/types';
import ClusterCard from '@/components/ClusterCard';
import NoResults from '@/components/NoResults';
import { Button } from '@/components/ui/button';
import { Trash2, Search, Info, X } from 'lucide-react';

interface DashboardProps {
  filteredClusters: ClusterType[];
  allClusters: ClusterType[];
  hasActiveFilters: boolean;
  onViewCluster: (cluster: ClusterType) => void;
  onDeleteCluster: (clusterId: string) => void;
  onClearAll: () => void;
  onAdjustFilters: () => void;
  isClearing: boolean;
  searchTerm: string;
  onClearSearch: () => void;
}

const Dashboard = ({
  filteredClusters,
  allClusters,
  hasActiveFilters,
  onViewCluster,
  onDeleteCluster,
  onClearAll,
  onAdjustFilters,
  isClearing,
  searchTerm,
  onClearSearch,
}: DashboardProps) => {
  const showNoFilterResults = allClusters.length > 0 && filteredClusters.length === 0 && hasActiveFilters && !searchTerm;
  const showNoSearchResults = allClusters.length > 0 && searchTerm && filteredClusters.length === 0;

  const [showMergeGuide, setShowMergeGuide] = useState(false);

  useEffect(() => {
    // Show guide only if there are clusters and the user hasn't seen it before in this session.
    const hasSeen = sessionStorage.getItem('hasSeenMergeGuide');
    if (!hasSeen && filteredClusters.length > 0) {
      setShowMergeGuide(true);
    }
  }, [filteredClusters.length]);

  const handleDismissMergeGuide = () => {
    sessionStorage.setItem('hasSeenMergeGuide', 'true');
    setShowMergeGuide(false);
  };

  return (
    <div className="flex-1 w-full animate-fade-in">
      {filteredClusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onViewCluster={onViewCluster}
              onDeleteCluster={onDeleteCluster}
            />
          ))}
        </div>
      ) : showNoSearchResults ? (
        <div className="text-center py-16 flex flex-col items-center">
            <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No Results Found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">We couldn't find any collections matching "{searchTerm}".</p>
            <Button variant="outline" onClick={onClearSearch} className="mt-4">
                Clear Search
            </Button>
        </div>
      ) : showNoFilterResults ? (
        <NoResults onAdjustFilters={onAdjustFilters} />
      ) : null}

      {allClusters.length > 0 && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={onClearAll} className="text-destructive hover:text-destructive/80 hover:border-destructive/50" disabled={isClearing}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isClearing ? 'Clearing...' : 'Clear All Collections'}
          </Button>
        </div>
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

export default Dashboard;
