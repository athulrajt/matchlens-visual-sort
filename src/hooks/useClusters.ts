import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { ClusterType, ImageType } from '@/types';
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
                    return { id: img.id, alt: img.alt, url: publicUrlResult.data.publicUrl, image_path: img.image_path };
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
    
    const moveImageToClusterMutation = useMutation({
        mutationFn: async ({ image, newClusterId }: { image: ImageType; newClusterId: string }) => {
            if (!user || !image.image_path) {
                throw new Error("User not authenticated or image path is missing.");
            }

            const oldPath = image.image_path;
            const pathParts = oldPath.split('/');
            const filename = pathParts[pathParts.length - 1];
            const newPath = `${user.id}/${newClusterId}/${filename}`;

            // 1. Move file in storage
            const { error: moveError } = await supabase.storage.from('cluster-images').move(oldPath, newPath);
            if (moveError) {
                throw new Error(`Failed to move image in storage: ${moveError.message}`);
            }

            // 2. Update database
            const { error: dbError } = await supabase.from('images').update({
                cluster_id: newClusterId,
                image_path: newPath,
            }).eq('id', image.id);

            if (dbError) {
                // Attempt to rollback storage move
                await supabase.storage.from('cluster-images').move(newPath, oldPath);
                throw new Error(`Failed to update image record: ${dbError.message}`);
            }

            return { image, newClusterId };
        },
        onSuccess: () => {
            toast.success("Image moved successfully.");
            queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
        },
        onError: (error: Error) => {
            toast.error("Failed to move image", { description: error.message });
        },
    });

    const moveImage = (image: ImageType, newClusterId: string, onSuccessCallback?: () => void) => {
        const currentCluster = clusters.find(c => c.images.some(i => i.id === image.id));
        if (currentCluster?.id === newClusterId) {
            return;
        }

        if (user) {
            moveImageToClusterMutation.mutate({ image, newClusterId }, {
                onSuccess: () => {
                    onSuccessCallback?.();
                }
            });
        } else {
            // Guest logic
            const oldClusterIndex = clusters.findIndex(c => c.images.some(i => i.id === image.id));
            const newClusterIndex = clusters.findIndex(c => c.id === newClusterId);

            if (oldClusterIndex > -1 && newClusterIndex > -1) {
                const updatedClusters = JSON.parse(JSON.stringify(clusters));
                
                const oldCluster = updatedClusters[oldClusterIndex];
                const imageToMoveIndex = oldCluster.images.findIndex((i: ImageType) => i.id === image.id);
                const [imageToMove] = oldCluster.images.splice(imageToMoveIndex, 1);

                const newCluster = updatedClusters[newClusterIndex];
                newCluster.images.push(imageToMove);
                
                localStorage.setItem('guestClusters', JSON.stringify(updatedClusters));
                setClusters(updatedClusters);
                toast.success("Image moved successfully.");
                onSuccessCallback?.();
            } else {
                toast.error("Could not move image locally.");
            }
        }
    };

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

    const mergeClustersMutation = useMutation({
        mutationFn: async ({ cluster1Id, cluster2Id, newName }: { cluster1Id: string, cluster2Id: string, newName: string }) => {
            if (!user) throw new Error("User not authenticated");

            const cluster1 = clusters.find(c => c.id === cluster1Id);
            const cluster2 = clusters.find(c => c.id === cluster2Id);

            if (!cluster1 || !cluster2) throw new Error("One or both clusters not found");

            // 1. Move images from cluster2 to cluster1
            for (const image of cluster2.images) {
                if (!image.image_path) continue;
                
                const oldPath = image.image_path;
                const pathParts = oldPath.split('/');
                const filename = pathParts[pathParts.length - 1];
                const newPath = `${user.id}/${cluster1.id}/${filename}`;

                const { error: moveError } = await supabase.storage.from('cluster-images').move(oldPath, newPath);
                if (moveError) {
                    console.error(`Failed to move image ${oldPath} to ${newPath}:`, moveError);
                    throw new Error(`Failed to move an image. Aborting merge.`);
                }

                const { error: dbError } = await supabase.from('images').update({
                    cluster_id: cluster1.id,
                    image_path: newPath,
                }).eq('id', image.id);

                if (dbError) {
                    console.error(`Failed to update image record for ${image.id}:`, dbError);
                    await supabase.storage.from('cluster-images').move(newPath, oldPath);
                    throw new Error(`Failed to update image record. Rolled back storage move.`);
                }
            }
            
            // 2. Combine metadata
            const combinedTags = Array.from(new Set([...(cluster1.tags || []), ...(cluster2.tags || [])]));
            const combinedPalette = Array.from(new Set([...(cluster1.palette || []), ...(cluster2.palette || [])])).slice(0, 5);
            const combinedDescription = `Merged from "${cluster1.title}" and "${cluster2.title}".\n\n${cluster1.description || ''}\n\n${cluster2.description || ''}`.trim();

            // 3. Update cluster1
            const { error: updateError } = await supabase.from('clusters').update({
                title: newName,
                tags: combinedTags,
                palette: combinedPalette,
                description: combinedDescription,
            }).eq('id', cluster1.id);

            if (updateError) {
                throw new Error(`Failed to update master cluster: ${updateError.message}`);
            }

            // 4. Delete cluster2
            const { error: deleteError } = await supabase.from('clusters').delete().eq('id', cluster2.id);

            if (deleteError) {
                console.error(`Failed to delete old cluster ${cluster2.id}:`, deleteError.message);
                toast.warning(`Failed to delete original cluster "${cluster2.title}". Please delete it manually.`);
            }

            return { mergedInto: newName, deleted: cluster2.title };
        },
        onSuccess: ({ mergedInto, deleted }) => {
            toast.success(`Clusters merged into "${mergedInto}"`, {
                description: `"${deleted}" was successfully merged and removed.`
            });
            queryClient.invalidateQueries({ queryKey: ['clusters', user?.id] });
        },
        onError: (error: Error) => {
            toast.error("Failed to merge clusters", { description: error.message });
        }
    });

    const mergeClusters = async ({ cluster1Id, cluster2Id, newName }: { cluster1Id: string, cluster2Id: string, newName: string }) => {
        if (user) {
            mergeClustersMutation.mutate({ cluster1Id, cluster2Id, newName });
        } else {
            // Guest logic
            const currentClusters: ClusterType[] = JSON.parse(JSON.stringify(clusters));
            const c1Index = currentClusters.findIndex(c => c.id === cluster1Id);
            const c2Index = currentClusters.findIndex(c => c.id === cluster2Id);

            if (c1Index === -1 || c2Index === -1) {
                toast.error("Could not find clusters to merge.");
                return;
            }

            const cluster1 = currentClusters[c1Index];
            const cluster2 = currentClusters[c2Index];

            const c1OriginalTitle = cluster1.title;
            const c2OriginalTitle = cluster2.title;

            // Combine images
            cluster1.images.push(...cluster2.images);
            
            // Combine metadata
            cluster1.title = newName;
            cluster1.tags = Array.from(new Set([...(cluster1.tags || []), ...(cluster2.tags || [])]));
            cluster1.palette = Array.from(new Set([...(cluster1.palette || []), ...(cluster2.palette || [])])).slice(0, 5);
            cluster1.description = `Merged from "${c1OriginalTitle}" and "${c2OriginalTitle}".`;

            // Remove cluster2
            const updatedClusters = currentClusters.filter((c: ClusterType) => c.id !== cluster2Id);

            localStorage.setItem('guestClusters', JSON.stringify(updatedClusters));
            setClusters(updatedClusters);

            toast.success(`Clusters merged into "${newName}"`, {
                description: `"${c2OriginalTitle}" was successfully merged and removed.`
            });
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
        moveImage,
        moveImageToClusterMutation,
        mergeClusters,
        mergeClustersMutation,
    };
};
