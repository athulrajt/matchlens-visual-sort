
import React from 'react';
import { ClusterType } from '@/types';
import ClusterCard from './ClusterCard';
import { LayoutGrid } from 'lucide-react';

interface ClusterGridProps {
  clusters: ClusterType[];
  onViewCluster: (cluster: ClusterType) => void;
}

const ClusterGrid: React.FC<ClusterGridProps> = ({ clusters, onViewCluster }) => {
  if (clusters.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
        <LayoutGrid className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Clusters Yet</h2>
        <p className="text-muted-foreground">
          Upload some images or simulate AI clustering to see your results here.
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Your grouped grids</h2>
        {/* Placeholder for sort/filter controls */}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {clusters.map((cluster) => (
          <ClusterCard key={cluster.id} cluster={cluster} onViewCluster={onViewCluster} />
        ))}
      </div>
    </main>
  );
};

export default ClusterGrid;
