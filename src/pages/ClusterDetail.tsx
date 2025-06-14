import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClusterType, ImageType } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';

const ClusterDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clusterId } = useParams<{ clusterId?: string }>();
  const [cluster, setCluster] = useState<ClusterType | undefined>(location.state?.cluster);

  useEffect(() => {
    if (cluster) {
        window.scrollTo(0, 0);
        return;
    }

    if (clusterId) {
        try {
            const storedClustersRaw = sessionStorage.getItem('clusters');
            if (storedClustersRaw) {
                const storedClusters = JSON.parse(storedClustersRaw) as ClusterType[];
                const foundCluster = storedClusters.find(c => c.id === clusterId);
                if (foundCluster) {
                    setCluster(foundCluster);
                    window.scrollTo(0, 0);
                    return;
                }
            }
        } catch (error) {
            console.error("Error loading cluster from session storage", error);
        }
    }
    
    toast.error("Cluster data not found. Returning to the main page.");
    navigate('/');
  }, [cluster, clusterId, navigate]);

  if (!cluster) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleExport = () => {
    toast.info(`Exporting ${cluster.images.length} images from "${cluster.title}"...`);
    // Placeholder for actual export logic
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-transparent animate-slide-in-right">
        <Header isScrolled={true} />
        <main className="container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground hover:bg-transparent">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Clusters
                </Button>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="max-w-xl">
                        <h1 className="text-3xl font-bold text-foreground">{cluster.title}</h1>
                        <p className="text-muted-foreground mt-1">{cluster.description || `${cluster.images.length} images in this cluster.`}</p>
                    </div>
                    <Button onClick={handleExport} size="icon">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {cluster.images.map((image: ImageType, index) => (
                    <div key={image.id} className="aspect-square rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-scale-in" style={{ animationDelay: `${index * 20}ms`}}>
                        <img 
                            src={image.url} 
                            alt={image.alt} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>
        </main>
    </div>
  );
};

export default ClusterDetailPage;
