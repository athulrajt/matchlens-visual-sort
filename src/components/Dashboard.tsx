
import { useState, useMemo } from 'react';
import { ClusterType } from '@/types';
import ClusterCard from '@/components/ClusterCard';
import NoResults from '@/components/NoResults';
import { Button } from '@/components/ui/button';
import { Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DashboardProps {
  filteredClusters: ClusterType[];
  allClusters: ClusterType[];
  hasActiveFilters: boolean;
  onViewCluster: (cluster: ClusterType) => void;
  onDeleteCluster: (clusterId: string) => void;
  onClearAll: () => void;
  onAdjustFilters: () => void;
  isClearing: boolean;
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
}: DashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');

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
  
  const showNoFilterResults = allClusters.length > 0 && filteredClusters.length === 0 && hasActiveFilters;
  const showNoSearchResults = allClusters.length > 0 && searchTerm && searchedClusters.length === 0;

  return (
    <div className="flex-1 w-full animate-fade-in">
      <div className="mb-8 w-full max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search collections by name or description..."
            className="pl-11 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {searchedClusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {searchedClusters.map((cluster) => (
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
            <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-4">
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
    </div>
  );
};

export default Dashboard;
