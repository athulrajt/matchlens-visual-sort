
import { pipeline, env } from '@huggingface/transformers';

// Caches for our AI pipelines to avoid reloading models.
let featureExtractor: any = null;
let captioner: any = null;

// Configure transformers.js to fetch models from the Hub.
env.allowLocalModels = false;
env.useBrowserCache = false;

/**
 * Gets a cached image-feature-extraction pipeline.
 * This is used for similarity-based clustering.
 */
export const getFeatureExtractor = async () => {
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
export const getCaptioner = async () => {
    if (captioner === null) {
        captioner = await pipeline(
            'image-to-text',
            'Salesforce/blip-image-captioning-base'
        );
        console.log("✅ Captioner (for tagging) model loaded.");
    }
    return captioner;
};
