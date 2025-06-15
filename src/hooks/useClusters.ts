
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
            const newClustersFromAI = await clusterImages(files, onProgress, beforeClustering);
            if (newClustersFromAI.length === 0) throw new Error("The AI could not create any clusters from your images.");

            let createdCount = 0;
            let updatedCount = 0;

            if (user) {
                const { count, error: countError } = await supabase.from('clusters').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                if (countError) throw countError;

                toast.info(`Processing ${newClustersFromAI.length} potential collection(s)...`);
                
                for (const aiCluster of newClustersFromAI) {
                    const existingCluster = clusters.find(c => c.title.toLowerCase() === aiCluster.title.toLowerCase());

                    if (existingCluster) {
                        updatedCount++;
                        const newTags = Array.from(new Set([...(existingCluster.tags || []), ...(aiCluster.tags || [])]));
                        await supabase.from('clusters').update({
                            description: aiCluster.description,
                            tags: newTags,
                            palette: aiCluster.palette,
                        }).eq('id', existingCluster.id);

                        for (const image of aiCluster.images) {
                            const file = nameToFileMap.get(image.alt);
                            if (!file) continue;
                            const imagePath = `${user.id}/${existingCluster.id}/${uuidv4()}-${file.name}`;
                            const { error: uploadError } = await supabase.storage.from('cluster-images').upload(imagePath, file);
                            if (uploadError) { console.error('Failed to upload image', uploadError); continue; }
                            await supabase.from('images').insert({ cluster_id: existingCluster.id, user_id: user.id, image_path: imagePath, alt: file.name });
                        }
                    } else {
                        if (count !== null && (count + createdCount) >= 15) {
                            toast.warning("Collection limit reached", { description: `Skipping creation of "${aiCluster.title}" as you've reached your limit of 15 collections.` });
                            continue;
                        }

                        createdCount++;
                        const { data: newCluster, error: clusterError } = await supabase.from('clusters').insert({ user_id: user.id, title: aiCluster.title, description: aiCluster.description, tags: aiCluster.tags, palette: aiCluster.palette }).select().single();
                        if (clusterError) {
                            createdCount--;
                            console.error(`Failed to create cluster "${aiCluster.title}":`, clusterError);
                            continue;
                        }

                        for (const image of aiCluster.images) {
                            const file = nameToFileMap.get(image.alt);
                            if (!file) continue;
                            const imagePath = `${user.id}/${newCluster.id}/${uuidv4()}-${file.name}`;
                            const { error: uploadError } = await supabase.storage.from('cluster-images').upload(imagePath, file);
                            if (uploadError) { console.error('Failed to upload image', uploadError); continue; }
                            await supabase.from('images').insert({ cluster_id: newCluster.id, user_id: user.id, image_path: imagePath, alt: file.name });
                        }
                    }
                }
            } else {
                // Guest logic
                let currentLocalClusters: ClusterType[] = JSON.parse(localStorage.getItem('guestClusters') || '[]');
                const aiClustersWithTempIds = newClustersFromAI.map(cluster => ({ ...cluster, id: uuidv4(), images: cluster.images.map(image => ({ ...image, id: uuidv4() })) }));

                for (const aiCluster of aiClustersWithTempIds) {
                    const existingClusterIndex = currentLocalClusters.findIndex(c => c.title.toLowerCase() === aiCluster.title.toLowerCase());
                    if (existingClusterIndex > -1) {
                        updatedCount++;
                        const existingCluster = currentLocalClusters[existingClusterIndex];
                        const newTags = Array.from(new Set([...(existingCluster.tags || []), ...(aiCluster.tags || [])]));
                        currentLocalClusters[existingClusterIndex] = {
                            ...existingCluster,
                            description: aiCluster.description,
                            tags: newTags,
                            palette: aiCluster.palette,
                            images: [...existingCluster.images, ...aiCluster.images],
                        };
                    } else {
                        createdCount++;
                        currentLocalClusters.unshift(aiCluster);
                    }
                }
                localStorage.setItem('guestClusters', JSON.stringify(currentLocalClusters));
                setClusters(currentLocalClusters);
            }
            return { createdCount, updatedCount };
        },
        onSuccess: ({ createdCount, updatedCount }) => {
            if (user) {
                let description = "";
                if (createdCount > 0) description += `${createdCount} new collection(s) created. `;
                if (updatedCount > 0) description += `${updatedCount} existing collection(s) updated.`;
                
                if (description) {
                    toast.success("Collections processed successfully", { description: description.trim() });
                } else {
                    toast.info("No new collections to create or update.");
                }
                queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
            } else { // guest
                let message = "";
                if (createdCount > 0) message += `${createdCount} new collection(s) created. `;
                if (updatedCount > 0) message += `${updatedCount} existing collection(s) updated.`;

                if (message) {
                    toast.success("Collections processed", { description: `${message.trim()} Sign up to save them permanently.` });
                } else {
                    toast.info("No new collections to create or update.", { description: "Sign up to save them permanently." });
                }
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
