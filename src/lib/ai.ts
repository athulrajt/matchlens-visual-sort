
import { pipeline, RawImage } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { ClusterType, ImageType } from '@/types';

// To prevent re-initializing the model on every upload, we'll cache it.
let extractor = null;

const getExtractor = async () => {
  if (extractor === null) {
    // The previous model, 'dinov2-base', failed because the feature-extraction pipeline
    // was incorrectly trying to load a text tokenizer, which doesn't exist for that vision-only model.
    // We are switching to 'Xenova/clip-vit-base-patch32', a standard and reliable Vision Transformer model.
    // It's well-supported for this task and includes the necessary components for the pipeline to work correctly.
    // We also explicitly set `quantized: false` to use the full-precision model for better accuracy and stability.
    extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', { quantized: false } as any);
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
        // img.crossOrigin = 'Anonymous'; // This is not needed for Object URLs and can cause silent errors.
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
 * Takes an array of image files, extracts their features using an AI model,
 * and groups them into clusters based on visual similarity.
 * @param files An array of image files.
 * @returns A promise that resolves to an array of ClusterType objects.
 */
export const clusterImages = async (files: File[]): Promise<ClusterType[]> => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
        console.warn("Some files were not images and have been filtered out.");
    }
    
    // Log file details for debugging, as suggested.
    console.table(imageFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
    })));

    if (imageFiles.length === 0) return [];
    
    const featureExtractor = await getExtractor();
    console.log("✅ Feature extractor loaded:", !!featureExtractor);

    // 1. Extract embeddings for all images in parallel, handling errors
    const embeddingResults = await Promise.all(
        imageFiles.map(async (file, i) => {
            console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
            const imageInfo: ImageType = {
                id: `${file.name}-${i}`,
                url: URL.createObjectURL(file),
                alt: file.name
            };

            try {
                // Reverting to RawImage.fromBlob() as it's a more direct and reliable way to handle local files
                // compared to passing blob URLs, which was causing issues.
                const image = await RawImage.fromBlob(file);
                
                const res = await featureExtractor(image, { pooling: 'mean', normalize: true });
                
                console.log(`✅ Embedding extracted for ${file.name}.`);

                if (!res || !res.data || !(res.data instanceof Float32Array)) {
                    throw new Error(`Invalid result from feature extractor for ${file.name}. Expected Float32Array, got ${res?.data?.constructor?.name}.`);
                }

                return {
                    embedding: Array.from(res.data as Float32Array),
                    info: imageInfo
                };
            } catch (err) {
                console.error(`❌ Failed to process image ${imageInfo.alt}:`, {
                    error: err,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                });
                // Important: Revoke the object URL if processing fails to prevent memory leaks.
                URL.revokeObjectURL(imageInfo.url);
                return null;
            }
        })
    );
    
    const validResults = embeddingResults.filter(Boolean) as { embedding: number[], info: ImageType }[];

    // If not enough images were processed successfully for clustering
    if (validResults.length < 2) {
        if (validResults.length === 1) {
            const { info } = validResults[0];
            return [{
                id: `cluster-single-${info.id}`,
                title: 'Single Image',
                description: 'Only one image was processed successfully.',
                images: [info],
                palette: await getPaletteFromImage(info.url).catch(() => []),
            }];
        }
        // If 0 valid results, all URLs have been revoked in catch blocks. No memory leak.
        return [];
    }

    const embeddings = validResults.map(r => r.embedding);
    const validImageInfos = validResults.map(r => r.info);

    // 2. Determine the optimal number of clusters (k) and run k-means
    const k = Math.min(Math.max(2, Math.ceil(validImageInfos.length / 4)), 10, validImageInfos.length);
    const result = kmeans(embeddings, k, { initialization: 'kmeans++' });
    const assignments = result.clusters;

    // 3. Group images into cluster data structures
    const tempClusters: { [key: number]: ImageType[] } = {};
    assignments.forEach((clusterIndex, imageIndex) => {
        if (!tempClusters[clusterIndex]) {
            tempClusters[clusterIndex] = [];
        }
        tempClusters[clusterIndex].push(validImageInfos[imageIndex]);
    });

    // 4. Format clusters and generate palettes in parallel
    const finalClusters = await Promise.all(
        Object.values(tempClusters).map(async (images, index) => {
            // Safety check for empty clusters, although it shouldn't happen with current logic.
            if (images.length === 0) return null;
            
            const palette = await getPaletteFromImage(images[0].url).catch(err => {
                console.error(`Failed to generate palette for cluster ${index + 1}:`, err);
                return []; // Return empty palette on error
            });
            return {
                id: `cluster-${index}-${Date.now()}`,
                title: `Smart Cluster ${index + 1}`,
                description: `A collection of ${images.length} visually similar images.`,
                images: images,
                palette: palette
            };
        })
    );
    
    return finalClusters.filter(Boolean) as ClusterType[];
};
