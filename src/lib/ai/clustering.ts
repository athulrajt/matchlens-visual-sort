
import { RawImage } from '@huggingface/transformers';
import { ClusterType, ImageType } from '@/types';
import { getClassifier, getFeatureExtractor } from './pipelines';
import { getPaletteFromImage, getCLIPTags } from './image-processing';
import { kmeans } from 'ml-kmeans';

type ProcessedImage = ImageType & { 
    file: File; 
    embedding: number[]; 
    tags: {label: string, score: number}[];
};

const generateClusterMetadata = async (images: ProcessedImage[], title: string): Promise<ClusterType> => {
    const allTags = images.flatMap(image => image.tags.map(t => t.label));
    const tagFrequencies = allTags.reduce<Record<string, number>>((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {});

    const topTags = Object.entries(tagFrequencies)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5)
        .map(([tag]) => tag);
    
    const description = topTags.length > 0
        ? `A collection of ${images.length} images related to: ${topTags.join(', ')}.`
        : `A collection of ${images.length} similar images.`;
    
    // Generate palette only for the first image to save time
    const palette = images.length > 0 ? await getPaletteFromImage(images[0].url).catch(() => []) : [];
    const finalImages: ImageType[] = images.map(({ file, embedding, tags, ...rest }) => rest);
    const idSuffix = title.replace(/\s+/g, '-').toLowerCase();

    return {
        id: `cluster-${idSuffix}-${Date.now()}`,
        title: title,
        description,
        images: finalImages,
        palette,
        tags: topTags,
    };
};

/**
 * Process a single image to extract features and tags with optimized performance
 */
const processImage = async (
    imageInfo: ImageType & { file: File },
    featureExtractorPipeline: any,
    classifierPipeline: any
): Promise<ProcessedImage | null> => {
    try {
        // Load image once and reuse for both operations
        const image = await RawImage.read(imageInfo.file);
        
        // Process both operations in parallel for maximum speed
        const [featureResult, tags] = await Promise.all([
            featureExtractorPipeline(image, { pooling: 'mean', normalize: true }),
            getCLIPTags(classifierPipeline, image)
        ]);
        
        const embedding = Array.from(featureResult.data as Float32Array);
        return { ...imageInfo, embedding, tags };
    } catch (err) {
        console.error(`❌ Failed to process ${imageInfo.alt}:`, err);
        return null;
    }
};

/**
 * Process images with aggressive parallel batching for maximum speed
 */
const processImagesInBatches = async (
    imageInfos: (ImageType & { file: File })[],
    featureExtractorPipeline: any,
    classifierPipeline: any,
    onProgress: (args: { imageId: string, progress: number }) => void,
    batchSize: number = 6 // Increased from 3 to 6 for more parallelism
): Promise<ProcessedImage[]> => {
    const processedImages: ProcessedImage[] = [];
    
    // Process all batches in parallel for maximum speed
    const allBatches = [];
    for (let i = 0; i < imageInfos.length; i += batchSize) {
        const batch = imageInfos.slice(i, i + batchSize);
        allBatches.push(batch);
    }

    // Process batches in parallel instead of sequentially
    const batchPromises = allBatches.map(async (batch, batchIndex) => {
        const batchResults = await Promise.all(
            batch.map(async (info, inBatchIndex) => {
                const globalIndex = batchIndex * batchSize + inBatchIndex;
                onProgress({ imageId: info.id, progress: 10 });
                
                const result = await processImage(info, featureExtractorPipeline, classifierPipeline);
                
                if (result) {
                    onProgress({ imageId: info.id, progress: 100 });
                    return result;
                } else {
                    onProgress({ imageId: info.id, progress: -1 });
                    return null;
                }
            })
        );
        
        console.log(`✅ Processed batch ${batchIndex + 1}/${allBatches.length} in parallel`);
        return batchResults.filter(result => result !== null) as ProcessedImage[];
    });

    // Wait for all batches to complete
    const allBatchResults = await Promise.all(batchPromises);
    
    // Flatten results
    allBatchResults.forEach(batchResults => {
        processedImages.push(...batchResults);
    });
    
    return processedImages;
};

/**
 * Optimized clustering with parallel processing and smart defaults
 */
export const clusterImages = async (
    files: File[],
    onProgress: (args: { imageId: string, progress: number }) => void,
    beforeClustering: () => void
): Promise<ClusterType[]> => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
        console.warn("Some files were not images and have been filtered out.");
    }
    if (imageFiles.length === 0) return [];

    // Load AI pipelines in parallel for faster startup
    console.log("🚀 Loading AI models in parallel...");
    const [featureExtractorPipeline, classifierPipeline] = await Promise.all([
        getFeatureExtractor(),
        getClassifier()
    ]);
    console.log("✅ AI pipelines ready for high-speed processing.");

    // Create ImageType objects
    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
    }));

    // Optimized batch size calculation for maximum parallelism
    const optimalBatchSize = Math.min(8, Math.max(4, Math.ceil(imageFiles.length / 2)));
    console.log(`🔥 Processing ${imageFiles.length} images with batch size ${optimalBatchSize} for maximum speed`);
    
    const processedImages = await processImagesInBatches(
        imageInfos, 
        featureExtractorPipeline, 
        classifierPipeline, 
        onProgress,
        optimalBatchSize
    );
    
    // Signal that per-image processing is done and clustering is starting
    beforeClustering();
    
    if (processedImages.length < 1) return [];

    // Parallel clustering operations
    console.log('🚀 Starting parallel clustering operations...');
    const taggedGroups: Record<string, ProcessedImage[]> = {};
    const untaggedImages: ProcessedImage[] = [];

    // Group by top tag (fast operation)
    processedImages.forEach(image => {
        if (image.tags.length > 0) {
            const topTag = image.tags[0].label;
            if (!taggedGroups[topTag]) taggedGroups[topTag] = [];
            taggedGroups[topTag].push(image);
        } else {
            untaggedImages.push(image);
        }
    });

    const finalClusters: ClusterType[] = [];

    // Process all tagged groups in parallel for maximum speed
    console.log(`⚡ Processing ${Object.keys(taggedGroups).length} tagged groups in parallel...`);
    const groupProcessingPromises = Object.entries(taggedGroups).map(async ([tag, images]) => {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
        
        // Smaller threshold for sub-clustering to reduce processing time
        if (images.length <= 3) {
            return [await generateClusterMetadata(images, capitalizedTag)];
        }

        // Optimized k-means with reduced iterations for speed
        const features = images.map(img => img.embedding);
        const k = Math.min(Math.max(1, Math.ceil(features.length / 4)), 4); // Reduced cluster count

        if (k <= 1) {
            return [await generateClusterMetadata(images, capitalizedTag)];
        }

        try {
            // Use fewer iterations for faster clustering
            const kmeansResult = kmeans(features, k, { maxIterations: 50 }); // Reduced from default 100
            const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
            kmeansResult.clusters.forEach((clusterIndex, i) => {
                subGroups[clusterIndex].push(images[i]);
            });

            // Generate sub-cluster metadata in parallel
            const subClusterPromises = subGroups.map(async (subGroup, i) => {
                if (subGroup.length > 0) {
                    const subClusterTitle = `${capitalizedTag} #${i + 1}`;
                    return await generateClusterMetadata(subGroup, subClusterTitle);
                }
                return null;
            });

            const subClusters = await Promise.all(subClusterPromises);
            return subClusters.filter(cluster => cluster !== null) as ClusterType[];
        } catch (e) {
            console.error(`K-means failed for tag "${tag}", creating a single cluster.`, e);
            return [await generateClusterMetadata(images, capitalizedTag)];
        }
    });

    // Wait for all tagged groups to be processed
    const taggedClustersResults = await Promise.all(groupProcessingPromises);
    taggedClustersResults.forEach(clusters => finalClusters.push(...clusters));

    // Handle untagged images with optimized clustering
    if (untaggedImages.length > 0) {
        console.log(`⚡ Fast-clustering ${untaggedImages.length} untagged images...`);
        const features = untaggedImages.map(img => img.embedding);
        
        if (untaggedImages.length <= 3) {
            finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
        } else {
            const k = Math.min(Math.max(1, Math.ceil(features.length / 5)), 3); // Reduced cluster count
            try {
                const kmeansResult = kmeans(features, k, { maxIterations: 50 }); // Faster clustering
                const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
                kmeansResult.clusters.forEach((clusterIndex, i) => {
                    subGroups[clusterIndex].push(untaggedImages[i]);
                });
    
                // Parallel processing of miscellaneous clusters
                const miscClusterPromises = subGroups.map(async (subGroup, i) => {
                    if (subGroup.length > 0) {
                        const title = `Miscellaneous #${i + 1}`;
                        return await generateClusterMetadata(subGroup, title);
                    }
                    return null;
                });

                const miscClusters = await Promise.all(miscClusterPromises);
                miscClusters.forEach(cluster => {
                    if (cluster) finalClusters.push(cluster);
                });
            } catch (e) {
                console.error(`K-means failed for untagged images.`, e);
                finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
            }
        }
    }
    
    // Sort clusters by size (descending) for better presentation
    return finalClusters.sort((a, b) => b.images.length - a.images.length);
};
