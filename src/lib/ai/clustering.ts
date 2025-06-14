
import { RawImage } from '@huggingface/transformers';
import { ClusterType, ImageType } from '@/types';
import { getClassifier, getFeatureExtractor } from './pipelines';
import { getPaletteFromImage, getCLIPTags } from './image-processing';
import { kmeans } from 'ml-kmeans';

type ProcessedImage = ImageType & { 
    file: File; 
    embedding: number[]; 
    tags: string[];
};

/**
 * Takes an array of image files, generates embeddings and tags, clusters them using k-means,
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
    const classifierPipeline = await getClassifier();
    console.log("✅ AI pipelines ready for processing.");

    // 1. Create ImageType objects to hold initial file info
    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
    }));

    // 2. Extract features (embeddings) and tags for all images
    console.log('Extracting features and tags from images...');
    const processedImages = await Promise.all(
        imageInfos.map(async (info) => {
            try {
                const image = await RawImage.read(info.file);
                
                const featureResult = await featureExtractorPipeline(image, { pooling: 'mean', normalize: true });
                const embedding = Array.from(featureResult.data as Float32Array);

                const tags = await getCLIPTags(classifierPipeline, image);

                return { ...info, embedding, tags };
            } catch (err) {
                console.error(`❌ Failed to process ${info.alt}:`, err);
                URL.revokeObjectURL(info.url); // Prevent memory leak on error
                return null;
            }
        })
    );
    
    const validImages = processedImages.filter(img => img !== null) as ProcessedImage[];
    const validFeatures = validImages.map(img => img.embedding);

    if (validFeatures.length < 1) return [];

    // 3. Cluster images using k-means on the features
    console.log('Clustering images with k-means...');
    
    // Heuristic to determine the number of clusters (k)
    const k = Math.min(Math.max(1, Math.ceil(validFeatures.length / 4)), 10, validFeatures.length);
    
    const kmeansResult = kmeans(validFeatures, k, {});
    
    const clusteredImageGroups: { images: ProcessedImage[] }[] = Array.from({ length: k }, () => ({ images: [] }));
    kmeansResult.clusters.forEach((clusterIndex, i) => {
        if (clusteredImageGroups[clusterIndex]) {
            clusteredImageGroups[clusterIndex].images.push(validImages[i]);
        }
    });

    // 4. Process each cluster to generate metadata (title, tags, etc.)
    console.log('Generating metadata for clusters...');
    const finalClusters = await Promise.all(
        clusteredImageGroups
            .filter(c => c.images.length > 0)
            .map(async (clusterGroup, i) => {
                const { images } = clusterGroup;
                
                // Aggregate tags from all images in the cluster
                const allTags = images.flatMap(image => image.tags);
                const tagFrequencies = allTags.reduce<Record<string, number>>((acc, tag) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                }, {});

                const topTags = Object.entries(tagFrequencies)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .slice(0, 5) // Use top 5 tags for cluster summary
                    .map(([tag]) => tag);

                const clusterTitle = topTags.length > 0
                    ? `${topTags[0].charAt(0).toUpperCase() + topTags[0].slice(1)} Collection`
                    : `Image Cluster #${i + 1}`;
                
                const description = topTags.length > 0
                    ? `A collection of ${images.length} images related to: ${topTags.join(', ')}.`
                    : `A collection of ${images.length} similar images.`;
                
                const palette = await getPaletteFromImage(images[0].url).catch(() => []);

                // Remove processing-specific properties to match the ImageType interface
                const finalImages: ImageType[] = images.map(({ file, embedding, tags, ...rest }) => rest);

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
