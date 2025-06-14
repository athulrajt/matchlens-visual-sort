import { pipeline, RawImage, env } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { ClusterType, ImageType } from '@/types';

// Caches for our AI pipelines to avoid reloading models.
let featureExtractor: any = null;
let styleClassifier: any = null;

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
 * Gets a cached zero-shot-image-classification pipeline.
 * This is used to classify images into predefined style categories.
 */
const getStyleClassifier = async () => {
    if (styleClassifier === null) {
        styleClassifier = await pipeline(
            'zero-shot-image-classification',
            'Xenova/clip-vit-base-patch32'
        );
        console.log("✅ Style classifier (for aesthetics) model loaded.");
    }
    return styleClassifier;
}

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
 * Takes an array of image files, classifies them by style, and then groups them.
 * Images that don't fit a style are clustered by visual similarity.
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
    const classifier = await getStyleClassifier();
    const extractor = await getFeatureExtractor();
    console.log("✅ AI pipelines ready for processing.");

    // 1. Process all images to get style labels and feature embeddings
    const processingResults = await Promise.all(
        imageFiles.map(async (file, i) => {
            const imageInfo: ImageType = {
                id: `${file.name}-${i}`,
                url: URL.createObjectURL(file),
                alt: file.name
            };

            try {
                const image = await RawImage.read(file);

                // Classify image against our defined style labels
                const stylePredictions = await classifier(image, STYLE_LABELS, { top_k: 1 });
                const primaryStyle = stylePredictions[0];

                // Also get feature embedding for the similarity fallback
                const embeddingTensor = await extractor(image, { pooling: 'mean', normalize: true });
                const embedding = Array.from(embeddingTensor.data as Float32Array);

                console.log(`✅ Processed ${file.name}: Style - ${primaryStyle.label} (${primaryStyle.score.toFixed(2)})`);

                return {
                    info: imageInfo,
                    label: primaryStyle.score > 0.35 ? primaryStyle.label : 'miscellaneous', // Confidence threshold
                    embedding: embedding
                };
            } catch (err) {
                console.error(`❌ Failed to process image ${imageInfo.alt}:`, err);
                URL.revokeObjectURL(imageInfo.url); // Prevent memory leak on error
                return null;
            }
        })
    );
    
    const validResults = processingResults.filter(Boolean) as { info: ImageType, label: string, embedding: number[] }[];
    if (validResults.length === 0) return [];

    // 2. Separate images into style groups and a miscellaneous group
    const styleGroups: Record<string, { info: ImageType, embedding: number[] }[]> = {};
    const miscellaneousGroup: { info: ImageType, embedding: number[] }[] = [];

    validResults.forEach(result => {
        if (result.label === 'miscellaneous') {
            miscellaneousGroup.push(result);
        } else {
            if (!styleGroups[result.label]) styleGroups[result.label] = [];
            styleGroups[result.label].push(result);
        }
    });

    // 3. Create final clusters from the distinct style groups
    let finalClusters: (ClusterType | null)[] = await Promise.all(
        Object.entries(styleGroups).map(async ([style, items]) => {
            if (items.length === 0) return null;

            const images = items.map(item => item.info);
            const palette = await getPaletteFromImage(images[0].url).catch(() => []);
            const title = `Style: ${style.charAt(0).toUpperCase() + style.slice(1)}`;

            return {
                id: `cluster-style-${style}-${Date.now()}`,
                title: title,
                description: `A collection of ${images.length} images with a ${style} aesthetic.`,
                images,
                palette,
            };
        })
    );

    // 4. Handle miscellaneous images using k-means similarity clustering
    if (miscellaneousGroup.length > 0) {
        if (miscellaneousGroup.length < 2) {
            const { info } = miscellaneousGroup[0];
            const palette = await getPaletteFromImage(info.url).catch(() => []);
            finalClusters.push({
                id: `cluster-single-${info.id}`,
                title: 'Miscellaneous Image',
                description: 'This image did not fit a specific style category.',
                images: [info],
                palette,
            });
        } else {
            const miscEmbeddings = miscellaneousGroup.map(r => r.embedding);
            const miscImageInfos = miscellaneousGroup.map(r => r.info);
            
            const k = Math.min(Math.max(2, Math.ceil(miscImageInfos.length / 5)), 8, miscImageInfos.length);
            const kmeansResult = kmeans(miscEmbeddings, k, { initialization: 'kmeans++' });
            
            const tempClusters: { [key: number]: ImageType[] } = {};
            kmeansResult.clusters.forEach((clusterIndex, imageIndex) => {
                if (!tempClusters[clusterIndex]) tempClusters[clusterIndex] = [];
                tempClusters[clusterIndex].push(miscImageInfos[imageIndex]);
            });

            const miscClusters = await Promise.all(
                Object.values(tempClusters).map(async (images, index) => {
                    if (images.length === 0) return null;
                    const palette = await getPaletteFromImage(images[0].url).catch(() => []);
                    return {
                        id: `cluster-misc-${index}-${Date.now()}`,
                        title: `Miscellaneous Cluster ${index + 1}`,
                        description: `A group of ${images.length} visually similar images.`,
                        images,
                        palette,
                    };
                })
            );
            finalClusters.push(...miscClusters);
        }
    }
    
    return finalClusters.filter(Boolean) as ClusterType[];
};
