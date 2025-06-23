import { RawImage } from '@huggingface/transformers';
import { ClusterType, ImageType } from '@/types';
import { getClassifier, getFeatureExtractor } from './pipelines';
import { getPaletteFromImage, getCLIPTags } from './image-processing';
import { kmeans } from 'ml-kmeans';

type ProcessedImage = ImageType & { 
    file: File; 
    embedding: number[]; 
    tags: { label: string, score: number }[];
};

// Throttle concurrent processing
const createSemaphore = (maxConcurrency: number) => {
    let running = 0;
    const queue: (() => void)[] = [];

    const next = () => {
        if (running < maxConcurrency && queue.length > 0) {
            running++;
            const task = queue.shift();
            if (task) task();
        }
    };

    return async <T>(fn: () => Promise<T>): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            queue.push(() => {
                fn().then(resolve, reject).finally(() => {
                    running--;
                    next();
                });
            });
            next();
        });
    };
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

    let palette: string[] = [];
    try {
        palette = await getPaletteFromImage(images[0].url);
    } catch {
        palette = [];
    }

    const finalImages: ImageType[] = images.map(({ file, embedding, tags, ...rest }) => rest);
    const idSuffix = title.replace(/\s+/g, '-').toLowerCase();

    return {
        id: `cluster-${idSuffix}-${Date.now()}`,
        title,
        description,
        images: finalImages,
        palette,
        tags: topTags,
    };
};

export const clusterImages = async (
    files: File[],
    onProgress: (args: { imageId: string, progress: number }) => void,
    beforeClustering: () => void
): Promise<ClusterType[]> => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return [];

    const featureExtractorPipeline = await getFeatureExtractor();
    const classifierPipeline = await getClassifier();
    console.log("✅ AI pipelines ready for processing.");

    const imageInfos: (ImageType & { file: File })[] = imageFiles.map((file, i) => ({
        id: `${file.name}-${i}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        file,
    }));

    const processedImages: ProcessedImage[] = [];
    const semaphore = createSemaphore(4); // Limit to 4 concurrent processes

    await Promise.all(
        imageInfos.map(info =>
            semaphore(async () => {
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
                    onProgress({ imageId: info.id, progress: -1 });
                }
            })
        )
    );

    beforeClustering();

    if (processedImages.length === 0) return [];

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

    for (const [tag, images] of Object.entries(taggedGroups)) {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);

        if (images.length <= 4) {
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
            continue;
        }

        const features = images.map(img => img.embedding);
        const k = Math.min(Math.max(1, Math.ceil(features.length / 5)), 3); // Reduced k for speed

        try {
            const kmeansResult = kmeans(features, k, {});
            const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
            kmeansResult.clusters.forEach((clusterIndex, i) => {
                subGroups[clusterIndex].push(images[i]);
            });

            const clusters = await Promise.all(
                subGroups.map((group, i) =>
                    generateClusterMetadata(group, `${capitalizedTag} #${i + 1}`)
                )
            );
            finalClusters.push(...clusters);
        } catch (e) {
            console.error(`K-means failed for tag "${tag}". Using fallback cluster.`, e);
            finalClusters.push(await generateClusterMetadata(images, capitalizedTag));
        }
    }

    if (untaggedImages.length > 0) {
        const features = untaggedImages.map(img => img.embedding);

        if (untaggedImages.length <= 4) {
            finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
        } else {
            const k = Math.min(Math.max(1, Math.ceil(features.length / 6)), 3); // Reduced k for speed
            try {
                const kmeansResult = kmeans(features, k, {});
                const subGroups: ProcessedImage[][] = Array.from({ length: k }, () => []);
                kmeansResult.clusters.forEach((clusterIndex, i) => {
                    subGroups[clusterIndex].push(untaggedImages[i]);
                });

                const clusters = await Promise.all(
                    subGroups.map((group, i) =>
                        generateClusterMetadata(group, `Miscellaneous #${i + 1}`)
                    )
                );
                finalClusters.push(...clusters);
            } catch (e) {
                console.error(`K-means failed for untagged images.`, e);
                finalClusters.push(await generateClusterMetadata(untaggedImages, "Miscellaneous"));
            }
        }
    }

    return finalClusters.sort((a, b) => b.images.length - a.images.length);
};
