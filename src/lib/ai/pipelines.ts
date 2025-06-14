
import { pipeline, env } from '@huggingface/transformers';

// Caches for our AI pipelines to avoid reloading models.
let featureExtractor: any = null;
let classifier: any = null;

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
 * Gets a cached zero-shot image classification pipeline.
 * This is used to generate descriptive tags for images from a controlled vocabulary.
 */
export const getClassifier = async () => {
    if (classifier === null) {
        classifier = await pipeline(
            'zero-shot-image-classification',
            'Xenova/clip-vit-base-patch16'
        );
        console.log("✅ Classifier (for tagging) model loaded.");
    }
    return classifier;
};
