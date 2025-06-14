
import { RawImage } from '@huggingface/transformers';
import { ClusterType, ImageType } from '@/types';
import { getCaptioner, getFeatureExtractor } from './pipelines';
import { getPaletteFromImage, getTagsForImage } from './image-processing';

/**
 * Takes an array of image files, generates tags for them, and clusters them based on shared tags.
 * @param files An array of image files.
 * @returns A promise that resolves to an array of ClusterType objects.
 */
export const clusterImages = async (files: File[]): Promise<ClusterType[]> => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
        console.warn("Some files were not images and have been filtered out.");
    }
    
    if (imageFiles.length === 0) return [];
    
    // Initialize both AI pipelines
    const captionerPipeline = await getCaptioner();
    // We still need the extractor for potential future use or more advanced clustering
    await getFeatureExtractor(); 
    console.log("✅ AI pipelines ready for processing.");

    // 1. Process all images to get tags and other info
    const processingResults = await Promise.all(
        imageFiles.map(async (file, i) => {
            const imageInfo: ImageType = {
                id: `${file.name}-${i}`,
                url: URL.createObjectURL(file),
                alt: file.name
            };

            try {
                const image = await RawImage.read(file);
                const tags = await getTagsForImage(captionerPipeline, image);
                console.log(`✅ Processed ${file.name}: Tags - [${tags.join(', ')}]`);

                return { info: imageInfo, tags };
            } catch (err) {
                console.error(`❌ Failed to process image ${imageInfo.alt}:`, err);
                URL.revokeObjectURL(imageInfo.url); // Prevent memory leak on error
                return null;
            }
        })
    );
    
    const validResults = processingResults.filter(Boolean) as { info: ImageType, tags: string[] }[];
    if (validResults.length === 0) return [];

    // 2. Cluster images using a greedy algorithm based on most frequent shared tags
    const finalClusters: (ClusterType | null)[] = [];
    let unclustered = [...validResults];
    const minClusterSize = 2;

    while (unclustered.length >= minClusterSize) {
        const tagFrequencies: Record<string, number> = {};
        unclustered.forEach(result => {
            result.tags.forEach(tag => {
                tagFrequencies[tag] = (tagFrequencies[tag] || 0) + 1;
            });
        });

        const bestTag = Object.entries(tagFrequencies)
            .filter(([, count]) => count >= minClusterSize)
            .sort(([, a], [, b]) => b - a)[0];

        if (!bestTag) break; // No more tags can form a valid cluster

        const [clusterTag] = bestTag;
        
        const newClusterItems = unclustered.filter(r => r.tags.includes(clusterTag));
        unclustered = unclustered.filter(r => !r.tags.includes(clusterTag));

        const images = newClusterItems.map(item => item.info);
        const palette = await getPaletteFromImage(images[0].url).catch(() => []);
        
        const allClusterTags = newClusterItems.flatMap(i => i.tags);
        const tagFrequenciesForCluster = allClusterTags.reduce<Record<string, number>>((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});

        const topTags = Object.entries(tagFrequenciesForCluster)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 5)
            .map(([tag]) => tag);

        finalClusters.push({
            id: `cluster-tag-${clusterTag}-${Date.now()}`,
            title: `${clusterTag.charAt(0).toUpperCase() + clusterTag.slice(1)} Collection`,
            description: `A collection of ${images.length} images related to "${clusterTag}".`,
            images,
            palette,
            tags: topTags,
        });
    }

    // 3. Handle any leftover images as single-item miscellaneous clusters
    if (unclustered.length > 0) {
        const miscClusters = await Promise.all(
            unclustered.map(async ({ info, tags }) => {
                const palette = await getPaletteFromImage(info.url).catch(() => []);
                return {
                    id: `cluster-single-${info.id}`,
                    title: 'Miscellaneous Image',
                    description: 'This image did not fit into a larger category.',
                    images: [info],
                    palette,
                    tags,
                };
            })
        );
        finalClusters.push(...miscClusters);
    }
    
    return finalClusters.filter(Boolean) as ClusterType[];
};
