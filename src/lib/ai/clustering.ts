
import { RawImage } from '@huggingface/transformers';
import { ClusterType, ImageType } from '@/types';
import { getCaptioner, getFeatureExtractor } from './pipelines';
import { getPaletteFromImage, getTagsForImage } from './image-processing';
import { kmeans } from 'ml-kmeans';

/**
 * Takes an array of image files, generates embeddings, clusters them using k-means,
 * and then generates descriptive metadata for each cluster.
 * @param files An array of image files.
 * @returns A promise that resolves to an array of ClusterType objects.
 */
export const clusterImages = async (files: File[]): Promise<ClusterType[]> => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
        console.warn("Some files were not images and have been filtered out.");
    }
    
    const numImages = imageFiles.length;
    if (numImages === 0) return [];
    
    // Initialize both AI pipelines
    const featureExtractorPipeline = await getFeatureExtractor();
    const captionerPipeline = await getCaptioner();
    console.log("✅ AI pipelines ready for processing.");

    // 1. Create ImageType objects to hold file info
    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
    }));

    // 2. Extract features (embeddings) for all images
    console.log('Extracting features from images...');
    const features = await Promise.all(
        imageInfos.map(async (info) => {
            try {
                const image = await RawImage.read(info.file);
                const result = await featureExtractorPipeline(image, { pooling: 'mean', normalize: true });
                return Array.from(result.data as Float32Array);
            } catch (err) {
                console.error(`❌ Failed to extract features from ${info.alt}:`, err);
                URL.revokeObjectURL(info.url); // Prevent memory leak on error
                return null;
            }
        })
    );
    
    const validFeatures = features.filter(f => f !== null) as number[][];
    const validImageInfos = imageInfos.filter((_, i) => features[i] !== null);

    if (validFeatures.length < 1) return [];

    // 3. Cluster images using k-means on the features
    console.log('Clustering images with k-means...');
    
    // Heuristic to determine the number of clusters (k)
    const k = Math.min(Math.max(1, Math.ceil(validFeatures.length / 4)), 10, validFeatures.length);
    
    const kmeansResult = kmeans(validFeatures, k, {});
    
    const clusteredImageGroups: { images: (ImageType & { file: File })[] }[] = Array.from({ length: k }, () => ({ images: [] }));
    kmeansResult.clusters.forEach((clusterIndex, i) => {
        if (clusteredImageGroups[clusterIndex]) {
            clusteredImageGroups[clusterIndex].images.push(validImageInfos[i]);
        }
    });

    // 4. Process each cluster to generate metadata (title, tags, etc.)
    console.log('Generating metadata for clusters...');
    const finalClusters = await Promise.all(
        clusteredImageGroups
            .filter(c => c.images.length > 0)
            .map(async (clusterGroup, i) => {
                const { images } = clusterGroup;
                
                // For tags and title, caption a few representative images from the cluster
                const representativeImages = images.slice(0, 3);
                const allTags: string[] = (await Promise.all(
                    representativeImages.map(async (imgInfo) => {
                        const rawImg = await RawImage.read(imgInfo.file);
                        return getTagsForImage(captionerPipeline, rawImg);
                    })
                )).flat();

                const tagFrequencies = allTags.reduce<Record<string, number>>((acc, tag) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                }, {});

                const topTags = Object.entries(tagFrequencies)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .slice(0, 5)
                    .map(([tag]) => tag);

                const clusterTitle = topTags.length > 0
                    ? `${topTags[0].charAt(0).toUpperCase() + topTags[0].slice(1)} Collection`
                    : `Image Cluster #${i + 1}`;
                
                const description = topTags.length > 0
                    ? `A collection of ${images.length} images related to: ${topTags.join(', ')}.`
                    : `A collection of ${images.length} similar images.`;
                
                const palette = await getPaletteFromImage(images[0].url).catch(() => []);

                // Remove the 'file' property before returning to match the ImageType interface
                const finalImages: ImageType[] = images.map(({ file, ...rest }) => rest);

                return {
                    id: `cluster-sim-${i}-${Date.now()}`,
                    title: clusterTitle,
                    description,
                    images: finalImages,
                    palette,
                    tags: topTags,
                };
            })
    );
    
    // Sort clusters by size (descending) for better presentation
    return finalClusters.sort((a, b) => b.images.length - a.images.length);
};
