
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClusterType, ImageType } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';

const ClusterDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cluster = location.state?.cluster as ClusterType | undefined;

  useEffect(() => {
    if (!cluster) {
      toast.error("Cluster data not found. Returning to the main page.");
      navigate('/');
    }
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, [cluster, navigate]);

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
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Clusters
                </Button>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="max-w-xl">
                        <h1 className="text-3xl font-bold text-foreground">{cluster.title}</h1>
                        <p className="text-muted-foreground mt-1">{cluster.description || `${cluster.images.length} images in this cluster.`}</p>
                    </div>
                    <Button onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Cluster
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
