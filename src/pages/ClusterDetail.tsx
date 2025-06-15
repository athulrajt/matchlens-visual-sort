import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClusterType, ImageType } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Info, X } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';
import ImageModal from '@/components/ImageModal';
import { useClusters } from '@/hooks/useClusters';
import { exportImagesToFigma } from '@/lib/figmaExport';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ClusterDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clusterId } = useParams<{ clusterId?: string }>();
  const [cluster, setCluster] = useState<ClusterType | undefined>(location.state?.cluster);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const { clusters: allClusters, moveImage, moveImageToClusterMutation } = useClusters();
  const [showImageViewGuide, setShowImageViewGuide] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('hasSeenImageViewGuide');
    if (!hasSeen) {
        setShowImageViewGuide(true);
    }
  }, []);
  
  useEffect(() => {
    if (cluster && !location.state?.cluster) { // Only scroll if not coming from navigation state
        return;
    }
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
  }, [cluster, clusterId, navigate, location.state?.cluster]);

  useEffect(() => {
    // Update local cluster state when allClusters from hook changes (e.g., after an image move)
    if (clusterId && allClusters.length > 0) {
        const updatedCluster = allClusters.find(c => c.id === clusterId);
        if (updatedCluster) {
            setCluster(updatedCluster);
        } else {
            // Cluster might have been deleted, navigate away.
            toast.error("The collection you were viewing no longer exists.");
            navigate('/');
        }
    }
  }, [allClusters, clusterId, navigate]);

  if (!cluster) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleExportToFigma = () => {
    if (!cluster) {
      toast.info("This collection has no images to export.");
      return;
    }
    exportImagesToFigma(cluster.images);
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };
  
  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };
  
  const handleNextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => (prev! + 1) % cluster.images.length);
    }
  };

  const handlePrevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => (prev! - 1 + cluster.images.length) % cluster.images.length);
    }
  };
  
  const handleDismissImageViewGuide = () => {
    sessionStorage.setItem('hasSeenImageViewGuide', 'true');
    setShowImageViewGuide(false);
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
                    <Button onClick={handleExportToFigma}>
                        <Copy className="mr-2 h-4 w-4" />
                        Export to Figma
                    </Button>
                </div>
            </div>

            {showImageViewGuide && (
              <Alert 
                  className="mb-6 bg-yellow-100/80 border-yellow-200 text-yellow-900 animate-fade-in relative pr-10"
              >
                  <Info className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Quick Tip!</AlertTitle>
                  <AlertDescription>
                      You can click on any image to view it in full screen and see more options.
                  </AlertDescription>
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismissImageViewGuide}
                    className="absolute top-1/2 -translate-y-1/2 right-1 h-8 w-8 text-yellow-900/70 hover:text-yellow-900 hover:bg-yellow-200/50 rounded-full"
                    aria-label="Dismiss tip"
                  >
                    <X className="h-4 w-4" />
                  </Button>
              </Alert>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {cluster.images.map((image: ImageType, index) => (
                    <div 
                        key={image.id} 
                        className="aspect-square rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-scale-in cursor-pointer group"
                        style={{ animationDelay: `${index * 20}ms`}}
                        onClick={() => handleImageClick(index)}
                    >
                        <img 
                            src={image.url} 
                            alt={image.alt} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                ))}
            </div>
        </main>
        {selectedImageIndex !== null && cluster.images[selectedImageIndex] && (
          <ImageModal 
            images={cluster.images}
            currentIndex={selectedImageIndex}
            onClose={handleCloseModal}
            onNext={handleNextImage}
            onPrev={handlePrevImage}
            allClusters={allClusters}
            currentClusterId={cluster.id}
            onMoveImage={moveImage}
            isMovingImage={moveImageToClusterMutation.isPending}
          />
        )}
    </div>
  );
};

export default ClusterDetailPage;
