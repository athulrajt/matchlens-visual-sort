import { RawImage } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { TAG_PROMPTS } from './prompts';

/**
 * Fast palette extraction with optimized sampling
 */
export const getPaletteFromImage = (imageUrl: string, colorCount = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error('Could not get canvas context'));

            // Optimized size for speed vs quality balance
            const size = 25;
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const data = ctx.getImageData(0, 0, size, size).data;
            const pixels: number[][] = [];
            
            // Sample every pixel for better quality
            for (let i = 0; i < data.length; i += 4) {
                // Ignore transparent pixels
                if (data[i + 3] < 128) continue;
                pixels.push([data[i], data[i + 1], data[i + 2]]);
            }

            if (pixels.length === 0) return resolve([]);

            // Use reasonable cluster count
            const clusterCount = Math.min(colorCount, pixels.length, 5);
            const result = kmeans(pixels, clusterCount, { maxIterations: 50 });
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
 * Optimized CLIP tagging with sequential processing for stability
 */
export const getCLIPTags = async (classifier: any, image: RawImage): Promise<{label: string, score: number}[]> => {
    const allMatches: {label: string, score: number}[] = [];
    const promptEntries = Object.values(TAG_PROMPTS);

    // Process prompts sequentially to avoid overwhelming the browser
    for (const prompts of promptEntries) {
        try {
            const result = await classifier(image, prompts, { top_k: 1 });
            const topMatch = result[0];

            // Reasonable threshold for good tags
            if (topMatch && topMatch.score > 0.5) {
                allMatches.push({ label: topMatch.label, score: topMatch.score });
            }
        } catch (e) {
            console.error("Failed to get CLIP tags for a category:", e);
        }
    }

    // Deduplicate by keeping highest score for each label
    const tagMap = new Map<string, number>();
    for (const match of allMatches) {
        if (!tagMap.has(match.label) || (tagMap.get(match.label) ?? 0) < match.score) {
            tagMap.set(match.label, match.score);
        }
    }

    const uniqueScoredTags = Array.from(tagMap.entries()).map(([label, score]) => ({ label, score }));

    // Return top 3 tags for faster processing
    return uniqueScoredTags.sort((a, b) => b.score - a.score).slice(0, 3);
};
