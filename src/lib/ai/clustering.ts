
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

    const featureExtractorPipeline = await getFeatureExtractor();
    const classifierPipeline = await getClassifier();
    console.log("✅ AI pipelines ready for processing.");

    // 1. Create ImageType objects
    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file: file,
    }));

    // Process images sequentially to provide progress updates
    const processedImages: ProcessedImage[] = [];
    for (const info of imageInfos) {
        try {
            onProgress({ imageId: info.id, progress: 10 });
            const image = await RawImage.read(info.file);

            onProgress({ imageId: info.id, progress: 30 });
            const featureResult = await featureExtractorPipeline(image, { pooling: 'mean', normalize: true });
            const embedding = Array.from(featureResult.data as Float32Array);
            
            onProgress({ imageId: info.id, progress: 70 });
            const tags = await getCLIPTags(classifierPipeline, image);

            processedImages.push({ ...info, embedding, tags });
            onProgress({ imageId: info.id, progress: 100 });
        } catch (err) {
            console.error(`❌ Failed to process ${info.alt}:`, err);
            // Mark as error. The URL will be revoked by the caller.
            onProgress({ imageId: info.id, progress: -1 });
        }
    }
    
    // Signal that per-image processing is done and clustering is starting
    beforeClustering();
    
    const validImages = processedImages;
    if (validImages.length < 1) return [];

    // 2. Group images by their top tag
    console.log('Grouping images by top tag...');
    const taggedGroups: Record<string, ProcessedImage[]> = {};
    const untaggedImages: ProcessedImage[] = [];

    validImages.forEach(image => {
        if (image.tags.length > 0) {
            const topTag = image.tags[0].label;
            if (!taggedGroups[topTag]) taggedGroups[topTag] = [];
            taggedGroups[topTag].push(image);
        } else {
            untaggedImages.push(image);
        }
    });

    const finalClusters: ClusterType[] = [];

    // 3. Process tagged groups, running k-means on larger ones
    console.log(`Processing ${Object.keys(taggedGroups).length} tagged groups...`);
    for (const [tag, images] of Object.entries(taggedGroups)) {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
        
        // If a group is small, just create one cluster for it
        if (images.length <= 4) {
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
            continue;
        }

        // If a group is larger, run k-means to find visual sub-clusters
        const features = images.map(img => img.embedding);
        const k = Math.min(Math.max(1, Math.ceil(features.length / 5)), 5);

        if (k <= 1) {
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
            continue;
        }

        try {
            const kmeansResult = kmeans(features, k, {});
            const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
            kmeansResult.clusters.forEach((clusterIndex, i) => {
                subGroups[clusterIndex].push(images[i]);
            });

            for (let i = 0; i < subGroups.length; i++) {
                if (subGroups[i].length > 0) {
                    const subClusterTitle = `${capitalizedTag} #${i + 1}`;
                    finalClusters.push(await generateClusterMetadata(subGroups[i], subClusterTitle));
                }
            }
        } catch (e) {
            console.error(`K-means failed for tag "${tag}", creating a single cluster.`, e);
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
        }
    }

    // 4. Cluster any remaining untagged images using k-means
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
    
                for (let i = 0; i < subGroups.length; i++) {
                    if (subGroups[i].length > 0) {
                        const title = `Miscellaneous #${i + 1}`;
                        finalClusters.push(await generateClusterMetadata(subGroups[i], title));
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
