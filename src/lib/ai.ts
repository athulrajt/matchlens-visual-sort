import { pipeline } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { ClusterType, ImageType } from '@/types';

// To prevent re-initializing the model on every upload, we'll cache it.
let extractor = null;

const getExtractor = async () => {
  if (extractor === null) {
    // Using a lightweight CLIP model for fast feature extraction in the browser.
    // The model will be downloaded on the first use.
    extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  return extractor;
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
        img.crossOrigin = 'Anonymous';
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
            const result = kmeans(pixels, Math.min(colorCount, pixels.length));
            const palette = result.centroids.map(c => {
                 const r = Math.round(c[0]);
                 const g = Math.round(c[1]);
                 const b = Math.round(c[2]);
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
            });
            resolve(palette);
        };
        img.onerror = reject;
        img.src = imageUrl;
    });
};

/**
 * Takes an array of image files, extracts their features using an AI model,
 * and groups them into clusters based on visual similarity.
 * @param files An array of image files.
 * @returns A promise that resolves to an array of ClusterType objects.
 */
export const clusterImages = async (files: File[]): Promise<ClusterType[]> => {
    const featureExtractor = await getExtractor();

    const imageInfos: ImageType[] = files.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name
    }));

    // Handle cases with too few images to cluster
    if (files.length <= 1) {
        if (files.length === 0) return [];
        return [{
            id: `cluster-single-${imageInfos[0].id}`,
            title: 'Single Image',
            description: 'Only one image was uploaded.',
            images: imageInfos,
            palette: await getPaletteFromImage(imageInfos[0].url),
        }];
    }

    // 1. Extract embeddings for all images
    const embeddings: number[][] = [];
    for (const image of imageInfos) {
        const imageEmbeddings = await featureExtractor(image.url, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(imageEmbeddings.data as Float32Array));
    }

    // 2. Determine the optimal number of clusters (k) and run k-means
    const k = Math.min(Math.max(2, Math.ceil(files.length / 4)), 10, files.length);
    const result = kmeans(embeddings, k, { initialization: 'kmeans++' });
    const assignments = result.clusters;

    // 3. Group images into cluster data structures
    const tempClusters: { [key: number]: ImageType[] } = {};
    assignments.forEach((clusterIndex, imageIndex) => {
        if (!tempClusters[clusterIndex]) {
            tempClusters[clusterIndex] = [];
        }
        tempClusters[clusterIndex].push(imageInfos[imageIndex]);
    });

    // 4. Format clusters and generate palettes
    const finalClusters: ClusterType[] = [];
    for (const clusterIndex in tempClusters) {
        const images = tempClusters[clusterIndex];
        if (images.length > 0) {
            finalClusters.push({
                id: `cluster-${clusterIndex}-${Date.now()}`,
                title: `Smart Cluster ${finalClusters.length + 1}`,
                description: `A collection of ${images.length} visually similar images.`,
                images: images,
                palette: await getPaletteFromImage(images[0].url)
            });
        }
    }
    
    return finalClusters;
};
