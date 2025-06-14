import { RawImage } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';
import { TAG_PROMPTS } from './prompts';

/**
 * Extracts a color palette from an image using the k-means algorithm on its pixels.
 * @param imageUrl The URL of the image to process.
 * @param colorCount The number of dominant colors to extract.
 * @returns A promise that resolves to an array of hex color strings.
 */
export const getPaletteFromImage = (imageUrl: string, colorCount = 5): Promise<string[]> => {
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
 * Generates a list of relevant tags for an image using a CLIP model
 * for zero-shot classification against a curated list of prompts.
 * @param classifier The zero-shot-image-classification pipeline instance.
 * @param image The RawImage to process.
 * @returns A promise that resolves to an array of tag objects with labels and scores, sorted by score.
 */
export const getCLIPTags = async (classifier: any, image: RawImage): Promise<{label: string, score: number}[]> => {
    const allMatches: {label: string, score: number}[] = [];

    for (const prompts of Object.values(TAG_PROMPTS)) {
        try {
            const result = await classifier(image, prompts, { top_k: 1 });
            const topMatch = result[0];

            // Add the tag only if its confidence score is above a threshold.
            if (topMatch && topMatch.score > 0.5) {
                allMatches.push({ label: topMatch.label, score: topMatch.score });
            }
        } catch (e) {
            console.error("Failed to get CLIP tags for a category:", e);
        }
    }

    // If a label appears multiple times, keep the one with the highest score.
    const tagMap = new Map<string, number>();
    for (const match of allMatches) {
        if (!tagMap.has(match.label) || (tagMap.get(match.label) ?? 0) < match.score) {
            tagMap.set(match.label, match.score);
        }
    }

    const uniqueScoredTags = Array.from(tagMap.entries()).map(([label, score]) => ({ label, score }));

    // Return unique tags, sorted by score in descending order
    return uniqueScoredTags.sort((a, b) => b.score - a.score);
};
