import { pipeline, RawImage, env } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { ClusterType, ImageType } from '@/types';

// Caches for our AI pipelines to avoid reloading models.
let featureExtractor: any = null;
let captioner: any = null;

// Configure transformers.js to fetch models from the Hub.
env.allowLocalModels = false;
env.useBrowserCache = false;

// We'll define a list of candidate style labels for our classifier.
const STYLE_LABELS = [
    'minimalist', 'brutalist', 'skeuomorphic', 'vintage', 'flat design', 
    'modern', 'abstract', 'photorealistic', 'cartoonish', 'art deco', 'typography'
];

/**
 * Gets a cached image-feature-extraction pipeline.
 * This is used for similarity-based clustering.
 */
const getFeatureExtractor = async () => {
    if (featureExtractor === null) {
        featureExtractor = await pipeline(
            'image-feature-extraction',
            'Xenova/clip-vit-base-patch32'
        );
        console.log("✅ Feature extractor (for similarity) model loaded.");
    }
    return featureExtractor;
};

/**
 * Gets a cached image-to-text pipeline.
 * This is used to generate descriptive captions for images, which are then turned into tags.
 */
const getCaptioner = async () => {
    if (captioner === null) {
        captioner = await pipeline(
            'image-to-text',
            'Salesforce/blip-image-captioning-base'
        );
        console.log("✅ Captioner (for tagging) model loaded.");
    }
    return captioner;
};

/**
 * Extracts a color palette from an image using the k-means algorithm on its pixels.
 * @param imageUrl The URL of the image to process.
 * @param colorCount The number of dominant colors to extract.
 * @returns A promise that resolves to an array of hex color strings.
 */
const getPaletteFromImage = (imageUrl: string, colorCount = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error('Could not get canvas context'));

            // Downsample for performance
            const size = 20; 
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const data = ctx.getImageData(0, 0, size, size).data;
            const pixels: number[][] = [];
            for (let i = 0; i < data.length; i += 4) {
                // Ignore transparent pixels
                if (data[i + 3] < 128) continue;
                pixels.push([data[i], data[i + 1], data[i + 2]]);
            }

            if (pixels.length === 0) return resolve([]);

            // Use k-means to find dominant colors
            const result = kmeans(pixels, Math.min(colorCount, pixels.length), {});
            const palette = result.centroids.map(c => {
                 const r = Math.round(c[0]);
                 const g = Math.round(c[1]);
                 const b = Math.round(c[2]);
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
            });
            resolve(palette);
        };
        img.onerror = (e) => {
            console.error('Image could not be loaded for palette generation:', e);
            reject(new Error('Image could not be loaded for palette generation'));
        };
        img.src = imageUrl;
    });
};

/**
 * Generates a list of tags for an image by creating a caption and processing it.
 * @param captioner The image-to-text pipeline instance.
 * @param image The RawImage to process.
 * @returns A promise that resolves to an array of string tags.
 */
const getTagsForImage = async (captioner: any, image: RawImage): Promise<string[]> => {
    try {
        const result = await captioner(image, { max_new_tokens: 20 });
        const text = result[0]?.generated_text.toLowerCase() || '';
        
        // Clean up common caption prefixes and split into tags
        const tags = text
            .replace(/^a (photography|photo|picture) of /i, '')
            .split(/[,.\-–\s]/)
            .map(tag => tag.trim())
            .filter(t => t.length > 2 && t.length < 20); // Filter for meaningful tags

        return [...new Set(tags)]; // Return unique tags
    } catch (e) {
        console.error("Failed to generate tags for an image:", e);
        return [];
    }
};

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

        const topTags = Object.keys(tagFrequenciesForCluster)
            .sort((a, b) => tagFrequenciesForCluster[b] - tagFrequenciesForCluster[a])
            .slice(0, 5);

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
