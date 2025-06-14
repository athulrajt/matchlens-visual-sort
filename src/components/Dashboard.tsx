
import { ClusterType } from '@/types';
import ClusterCard from '@/components/ClusterCard';
import NoResults from '@/components/NoResults';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

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
  return (
    <div className="flex-1 w-full animate-fade-in">
      {allClusters.length > 0 && filteredClusters.length === 0 && hasActiveFilters ? (
        <NoResults onAdjustFilters={onAdjustFilters} />
      ) : (
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
      )}

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
