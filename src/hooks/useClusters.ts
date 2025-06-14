
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { ClusterType } from '@/types';
import { clusterImages } from '@/lib/ai';

export const useClusters = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [clusters, setClusters] = useState<ClusterType[]>([]);

    const { data: supabaseClusters = [], isLoading: isLoadingClusters } = useQuery<ClusterType[]>({
        queryKey: ['clusters', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('clusters')
                .select(`id, title, description, tags, palette, images (id, image_path, alt)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                toast.error('Failed to fetch your collections.');
                console.error(error);
                return [];
            }

            return data.map(c => ({
                ...c,
                images: c.images.map(img => {
                    const publicUrlResult = supabase.storage.from('cluster-images').getPublicUrl(img.image_path);
                    return { id: img.id, alt: img.alt, url: publicUrlResult.data.publicUrl };
                })
            }));
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (user) {
            setClusters(supabaseClusters);
        } else {
            try {
                const localClustersRaw = localStorage.getItem('guestClusters');
                setClusters(localClustersRaw ? JSON.parse(localClustersRaw) : []);
            } catch (error) {
                console.error("Error loading guest clusters from local storage", error);
                setClusters([]);
            }
        }
    }, [user, supabaseClusters]);

    useEffect(() => {
        try {
            if (clusters.length > 0) {
                sessionStorage.setItem('clusters', JSON.stringify(clusters));
            } else {
                sessionStorage.removeItem('clusters');
            }
        } catch (error) {
            console.error("Error writing clusters to session storage", error);
        }
    }, [clusters]);

    const createClustersMutation = useMutation({
        mutationFn: async ({ files, nameToFileMap, onProgress, beforeClustering }: { files: File[], nameToFileMap: Map<string, File>, onProgress: any, beforeClustering: any }) => {
            if (user) {
                const { count, error: countError } = await supabase.from('clusters').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                if (countError) throw countError;
                if (count !== null && count >= 15) throw new Error("You've reached the limit of 15 collections.");

                const newClustersFromAI = await clusterImages(files, onProgress, beforeClustering);
                if (newClustersFromAI.length === 0) throw new Error("The AI could not create any clusters from your images.");

                toast.info(`Saving ${newClustersFromAI.length} new collection(s) to your account...`);
                for (const cluster of newClustersFromAI) {
                    const { data: newCluster, error: clusterError } = await supabase.from('clusters').insert({ user_id: user.id, title: cluster.title, description: cluster.description, tags: cluster.tags, palette: cluster.palette }).select().single();
                    if (clusterError) throw clusterError;

                    for (const image of cluster.images) {
                        const file = nameToFileMap.get(image.alt);
                        if (!file) continue;
                        const imagePath = `${user.id}/${newCluster.id}/${uuidv4()}-${file.name}`;
                        const { error: uploadError } = await supabase.storage.from('cluster-images').upload(imagePath, file);
                        if (uploadError) { console.error('Failed to upload image', uploadError); continue; }
                        await supabase.from('images').insert({ cluster_id: newCluster.id, user_id: user.id, image_path: imagePath, alt: file.name });
                    }
                }
                return newClustersFromAI;
            } else {
                // Guest logic
                const newClustersFromAI = await clusterImages(files, onProgress, beforeClustering);
                if (newClustersFromAI.length === 0) throw new Error("The AI could not create any clusters from your images.");

                const tempClustersForState = newClustersFromAI.map(cluster => ({ ...cluster, id: uuidv4(), images: cluster.images.map(image => ({ ...image, id: uuidv4() })) }));
                const currentLocalClusters = JSON.parse(localStorage.getItem('guestClusters') || '[]');
                const updatedLocalClusters = [...tempClustersForState, ...currentLocalClusters];
                localStorage.setItem('guestClusters', JSON.stringify(updatedLocalClusters));
                setClusters(updatedLocalClusters);
                return newClustersFromAI;
            }
        },
        onSuccess: (newClusters) => {
            if(user) {
                toast.success(`Successfully created and saved ${newClusters.length} new smart collection(s)!`);
                queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
            } else {
                toast.success(`Successfully created ${newClusters.length} new collection(s)!`, { description: "Sign up to save them permanently." });
            }
        },
        onError: (error: Error) => {
            toast.error("An error occurred", { description: error.message });
        },
    });

    const deleteClusterMutation = useMutation({
        mutationFn: async (clusterId: string) => {
            if (!user) throw new Error("User not found for deletion");
            const clusterToDelete = clusters.find(c => c.id === clusterId);
            if (!clusterToDelete) throw new Error("Cluster not found");
            
            const imagePaths = clusterToDelete.images.map(img => `${user.id}/${clusterToDelete.id}/${img.alt}`);
            if(imagePaths.length > 0) {
                const { error: storageError } = await supabase.storage.from('cluster-images').remove(imagePaths);
                if(storageError) console.error("Could not delete images from storage", storageError);
            }

            const { error } = await supabase.from('clusters').delete().eq('id', clusterId);
            if (error) throw error;
            return clusterToDelete.title;
        },
        onSuccess: (deletedTitle) => {
            toast.success(`Collection "${deletedTitle}" has been deleted.`);
            queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
        },
        onError: (error: Error) => toast.error("Failed to delete collection", { description: error.message })
    });

    const clearClustersMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("User not found for clearing collections");
            for (const cluster of clusters) {
                const imagePaths = cluster.images.map(img => `${user.id}/${cluster.id}/${img.alt}`);
                if(imagePaths.length > 0) await supabase.storage.from('cluster-images').remove(imagePaths);
            }
            const { error } = await supabase.from('clusters').delete().eq('user_id', user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.info("All your collections have been cleared.");
            queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
        },
        onError: (error: Error) => toast.error("Failed to clear collections", { description: error.message })
    });
    
    const deleteCluster = (clusterId: string) => {
        if (user) {
            deleteClusterMutation.mutate(clusterId);
        } else {
            const clusterToDelete = clusters.find(c => c.id === clusterId);
            if (clusterToDelete) clusterToDelete.images.forEach(image => URL.revokeObjectURL(image.url));
            const updated = clusters.filter(c => c.id !== clusterId);
            localStorage.setItem('guestClusters', JSON.stringify(updated));
            setClusters(updated);
            toast.success(`Collection has been deleted.`);
        }
    };

    const clearClusters = () => {
        if (user) {
            clearClustersMutation.mutate();
        } else {
            clusters.forEach(c => c.images.forEach(i => URL.revokeObjectURL(i.url)));
            localStorage.removeItem('guestClusters');
            setClusters([]);
            toast.info("All your local collections have been cleared.");
        }
    };

    return { 
        clusters, 
        isLoadingClusters, 
        createClusters: createClustersMutation.mutateAsync, 
        deleteCluster, 
        clearClusters, 
        clearClustersMutation,
        createClustersMutation,
    };
};
