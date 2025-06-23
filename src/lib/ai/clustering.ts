
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
    
    const palette = await getPaletteFromImage(images[0].url).catch(() => []);
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
 * Process a single image to extract features and tags
 */
const processImage = async (
    imageInfo: ImageType & { file: File },
    featureExtractorPipeline: any,
    classifierPipeline: any
): Promise<ProcessedImage | null> => {
    try {
        const image = await RawImage.read(imageInfo.file);
        
        // Process feature extraction and tagging in parallel
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
 * Process images in parallel batches for better performance
 */
const processImagesInBatches = async (
    imageInfos: (ImageType & { file: File })[],
    featureExtractorPipeline: any,
    classifierPipeline: any,
    onProgress: (args: { imageId: string, progress: number }) => void,
    batchSize: number = 3
): Promise<ProcessedImage[]> => {
    const processedImages: ProcessedImage[] = [];
    
    for (let i = 0; i < imageInfos.length; i += batchSize) {
        const batch = imageInfos.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (info, batchIndex) => {
            const globalIndex = i + batchIndex;
            onProgress({ imageId: info.id, progress: 10 });
            
            const result = await processImage(info, featureExtractorPipeline, classifierPipeline);
            
            if (result) {
                onProgress({ imageId: info.id, progress: 100 });
                return result;
            } else {
                onProgress({ imageId: info.id, progress: -1 });
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Add successful results to processed images
        batchResults.forEach(result => {
            if (result) processedImages.push(result);
        });
        
        console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imageInfos.length / batchSize)}`);
    }
    
    return processedImages;
};

/**
 * Takes an array of image files, generates embeddings and tags, groups them by top tag,
 * and then runs k-means within larger groups to create final clusters.
 * @param files An array of image files.
 * @param onProgress A callback to report progress for each image.
 * @param beforeClustering A callback executed before the final clustering step.
 * @returns A promise that resolves to an array of ClusterType objects.
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

    // Load AI pipelines once at the start
    const [featureExtractorPipeline, classifierPipeline] = await Promise.all([
        getFeatureExtractor(),
        getClassifier()
    ]);
    console.log("✅ AI pipelines ready for processing.");

    // 1. Create ImageType objects
    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
    }));

    // 2. Process images in parallel batches
    const batchSize = Math.min(3, Math.max(1, Math.floor(imageFiles.length / 4))); // Dynamic batch size
    const processedImages = await processImagesInBatches(
        imageInfos, 
        featureExtractorPipeline, 
        classifierPipeline, 
        onProgress,
        batchSize
    );
    
    // Signal that per-image processing is done and clustering is starting
    beforeClustering();
    
    if (processedImages.length < 1) return [];

    // 3. Group images by their top tag
    console.log('Grouping images by top tag...');
    const taggedGroups: Record<string, ProcessedImage[]> = {};
    const untaggedImages: ProcessedImage[] = [];

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

    // 4. Process tagged groups, running k-means on larger ones
    console.log(`Processing ${Object.keys(taggedGroups).length} tagged groups...`);
    const groupProcessingPromises = Object.entries(taggedGroups).map(async ([tag, images]) => {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
        
        // If a group is small, just create one cluster for it
        if (images.length <= 4) {
            return [await generateClusterMetadata(images, capitalizedTag)];
        }

        // If a group is larger, run k-means to find visual sub-clusters
        const features = images.map(img => img.embedding);
        const k = Math.min(Math.max(1, Math.ceil(features.length / 5)), 5);

        if (k <= 1) {
            return [await generateClusterMetadata(images, capitalizedTag)];
        }

        try {
            const kmeansResult = kmeans(features, k, {});
            const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
            kmeansResult.clusters.forEach((clusterIndex, i) => {
                subGroups[clusterIndex].push(images[i]);
            });

            const subClusters = await Promise.all(
                subGroups.map(async (subGroup, i) => {
                    if (subGroup.length > 0) {
                        const subClusterTitle = `${capitalizedTag} #${i + 1}`;
                        return await generateClusterMetadata(subGroup, subClusterTitle);
                    }
                    return null;
                })
            );

            return subClusters.filter(cluster => cluster !== null) as ClusterType[];
        } catch (e) {
            console.error(`K-means failed for tag "${tag}", creating a single cluster.`, e);
            return [await generateClusterMetadata(images, capitalizedTag)];
        }
    });

    // Process all tagged groups in parallel
    const taggedClustersResults = await Promise.all(groupProcessingPromises);
    taggedClustersResults.forEach(clusters => finalClusters.push(...clusters));

    // 5. Cluster any remaining untagged images using k-means
    if (untaggedImages.length > 0) {
        console.log(`Clustering ${untaggedImages.length} untagged images...`);
        const features = untaggedImages.map(img => img.embedding);
        
        if (untaggedImages.length <= 4) {
            finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
        } else {
            const k = Math.min(Math.max(1, Math.ceil(features.length / 6)), 4);
            try {
                const kmeansResult = kmeans(features, k, {});
                const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
                kmeansResult.clusters.forEach((clusterIndex, i) => {
                    subGroups[clusterIndex].push(untaggedImages[i]);
                });
    
                const miscClusters = await Promise.all(
                    subGroups.map(async (subGroup, i) => {
                        if (subGroup.length > 0) {
                            const title = `Miscellaneous #${i + 1}`;
                            return await generateClusterMetadata(subGroup, title);
                        }
                        return null;
                    })
                );

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
