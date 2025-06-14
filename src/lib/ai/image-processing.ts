
import { RawImage } from '@huggingface/transformers';
import { kmeans } from 'ml-kmeans';

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
 * Generates a list of tags for an image by creating a caption and processing it.
 * @param captioner The image-to-text pipeline instance.
 * @param image The RawImage to process.
 * @returns A promise that resolves to an array of string tags.
 */
export const getTagsForImage = async (captioner: any, image: RawImage): Promise<string[]> => {
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
