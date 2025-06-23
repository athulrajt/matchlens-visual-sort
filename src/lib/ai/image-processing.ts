import { RawImage } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { TAG_PROMPTS } from './prompts';

/**
 * Optimized palette extraction with reduced sampling for speed
 */
export const getPaletteFromImage = (imageUrl: string, colorCount = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error('Could not get canvas context'));

            // Further reduced size for maximum speed
            const size = 15; // Reduced from 20 to 15
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const data = ctx.getImageData(0, 0, size, size).data;
            const pixels: number[][] = [];
            
            // Sample every other pixel for speed (stride = 8 instead of 4)
            for (let i = 0; i < data.length; i += 8) {
                // Ignore transparent pixels
                if (data[i + 3] < 128) continue;
                pixels.push([data[i], data[i + 1], data[i + 2]]);
            }

            if (pixels.length === 0) return resolve([]);

            // Use fewer clusters and iterations for speed
            const clusterCount = Math.min(colorCount, pixels.length, 3); // Max 3 colors for speed
            const result = kmeans(pixels, clusterCount, { maxIterations: 20 }); // Reduced iterations
            const palette: string[] = result.centroids.map((c: number[]) => {
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
 * High-speed CLIP tagging with optimized prompt processing
 */
export const getCLIPTags = async (classifier: any, image: RawImage): Promise<{label: string, score: number}[]> => {
    const allMatches: {label: string, score: number}[] = [];
    const promptEntries = Object.values(TAG_PROMPTS);

    // Process prompts in parallel batches for speed
    const batchSize = 3; // Process 3 prompt categories at once
    const batches = [];
    for (let i = 0; i < promptEntries.length; i += batchSize) {
        batches.push(promptEntries.slice(i, i + batchSize));
    }

    // Process all batches in parallel
    const batchPromises = batches.map(async (batch) => {
        const batchResults = await Promise.all(
            batch.map(async (prompts) => {
                try {
                    const result = await classifier(image, prompts, { top_k: 1 });
                    const topMatch = result[0];

                    // Slightly lowered threshold for more tags
                    if (topMatch && topMatch.score > 0.45) {
                        return { label: topMatch.label, score: topMatch.score };
                    }
                    return null;
                } catch (e) {
                    console.error("Failed to get CLIP tags for a category:", e);
                    return null;
                }
            })
        );
        return batchResults.filter(result => result !== null);
    });

    // Wait for all batches and flatten results
    const allBatchResults = await Promise.all(batchPromises);
    allBatchResults.forEach(batchResults => {
        allMatches.push(...batchResults);
    });

    // Deduplicate by keeping highest score for each label
    const tagMap = new Map<string, number>();
    for (const match of allMatches) {
        if (!tagMap.has(match.label) || (tagMap.get(match.label) ?? 0) < match.score) {
            tagMap.set(match.label, match.score);
        }
    }

    const uniqueScoredTags = Array.from(tagMap.entries()).map(([label, score]) => ({ label, score }));

    // Return top 5 tags only for speed
    return uniqueScoredTags.sort((a, b) => b.score - a.score).slice(0, 5);
};
