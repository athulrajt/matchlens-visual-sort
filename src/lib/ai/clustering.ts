
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
 * Process a single image to extract features and tags
 */
const processImage = async (
    imageInfo: ImageType & { file: File },
    featureExtractorPipeline: any,
    classifierPipeline: any
): Promise<ProcessedImage | null> => {
    try {
        // Load image once and reuse for both operations
        const image = await RawImage.read(imageInfo.file);
        
        // Process both operations in parallel but don't overwhelm the system
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
 * Process images in smaller, more manageable batches
 */
const processImagesInBatches = async (
    imageInfos: (ImageType & { file: File })[],
    featureExtractorPipeline: any,
    classifierPipeline: any,
    onProgress: (args: { imageId: string, progress: number }) => void,
    batchSize: number = 2 // Reduced from 6 to 2 for better performance
): Promise<ProcessedImage[]> => {
    const processedImages: ProcessedImage[] = [];
    
    // Process batches sequentially to avoid overwhelming the browser
    for (let i = 0; i < imageInfos.length; i += batchSize) {
        const batch = imageInfos.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imageInfos.length / batchSize)}`);
        
        const batchResults = await Promise.all(
            batch.map(async (info, inBatchIndex) => {
                const globalIndex = i + inBatchIndex;
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
        
        const validResults = batchResults.filter(result => result !== null) as ProcessedImage[];
        processedImages.push(...validResults);
        
        console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}, processed ${validResults.length}/${batch.length} images`);
        
        // Small delay between batches to prevent browser freeze
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return processedImages;
};

/**
 * Optimized clustering with reasonable performance settings
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
    console.log("🚀 Loading AI models...");
    const [featureExtractorPipeline, classifierPipeline] = await Promise.all([
        getFeatureExtractor(),
        getClassifier()
    ]);
    console.log("✅ AI pipelines ready.");

    // Create ImageType objects
    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
    }));

    // Use smaller batch size for better performance
    const batchSize = Math.min(3, Math.max(1, Math.ceil(imageFiles.length / 4)));
    console.log(`⚡ Processing ${imageFiles.length} images with batch size ${batchSize}`);
    
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

    // Group by top tag (sequential processing for stability)
    console.log('🔄 Grouping images by content tags...');
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

    // Process tagged groups sequentially for stability
    console.log(`🔄 Processing ${Object.keys(taggedGroups).length} tagged groups...`);
    for (const [tag, images] of Object.entries(taggedGroups)) {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
        
        if (images.length <= 4) {
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
            continue;
        }

        // Use k-means clustering for larger groups
        const features = images.map(img => img.embedding);
        const k = Math.min(Math.max(1, Math.ceil(features.length / 5)), 3);

        if (k <= 1) {
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
            continue;
        }

        try {
            const kmeansResult = kmeans(features, k, { maxIterations: 100 });
            const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
            kmeansResult.clusters.forEach((clusterIndex, i) => {
                subGroups[clusterIndex].push(images[i]);
            });

            for (let i = 0; i < subGroups.length; i++) {
                const subGroup = subGroups[i];
                if (subGroup.length > 0) {
                    const subClusterTitle = `${capitalizedTag} #${i + 1}`;
                    finalClusters.push(await generateClusterMetadata(subGroup, subClusterTitle));
                }
            }
        } catch (e) {
            console.error(`K-means failed for tag "${tag}", creating a single cluster.`, e);
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
        }
    }

    // Handle untagged images
    if (untaggedImages.length > 0) {
        console.log(`🔄 Clustering ${untaggedImages.length} untagged images...`);
        const features = untaggedImages.map(img => img.embedding);
        
        if (untaggedImages.length <= 4) {
            finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
        } else {
            const k = Math.min(Math.max(1, Math.ceil(features.length / 5)), 3);
            try {
                const kmeansResult = kmeans(features, k, { maxIterations: 100 });
                const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
                kmeansResult.clusters.forEach((clusterIndex, i) => {
                    subGroups[clusterIndex].push(untaggedImages[i]);
                });
    
                for (let i = 0; i < subGroups.length; i++) {
                    const subGroup = subGroups[i];
                    if (subGroup.length > 0) {
                        const title = `Miscellaneous #${i + 1}`;
                        finalClusters.push(await generateClusterMetadata(subGroup, title));
                    }
                }
            } catch (e) {
                console.error(`K-means failed for untagged images.`, e);
                finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
            }
        }
    }
    
    // Sort clusters by size (descending) for better presentation
    return finalClusters.sort((a, b) => b.images.length - a.images.length);
};
