
import { ImageType } from '@/types';
import { toast } from 'sonner';

export const exportImagesToFigma = async (images: ImageType[]) => {
  if (!images || images.length === 0) {
    toast.info("This collection has no images to export.");
    return;
  }

  // Check for clipboard-write permission if the browser supports it
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
      if (permissionStatus.state === 'denied') {
        toast.error("Export failed: Permission denied", {
          description: "Please allow clipboard access in your browser's site settings to use this feature.",
        });
        return;
      }
    } catch (e) {
      console.warn("Could not query clipboard permission. Proceeding anyway.", e);
    }
  }

  const toastId = toast.loading(`Preparing ${images.length} images for Figma...`);

  try {
    const imageBlobs = await Promise.all(
      images.map(async (image) => {
        try {
          const response = await fetch(image.url);
          if (!response.ok) {
            console.error(`Failed to fetch image: ${response.statusText}`, image.url);
            return null;
          }
          return response.blob();
        } catch (error) {
          console.error(`Error fetching image ${image.url}:`, error);
          return null;
        }
      })
    );

    const successfulBlobs = imageBlobs.filter((blob): blob is Blob => blob !== null);

    if (successfulBlobs.length === 0) {
      throw new Error("Could not fetch any of the images.");
    }
    
    if (successfulBlobs.length < images.length) {
      toast.warning("Some images failed to load", {
        description: `Only ${successfulBlobs.length} out of ${images.length} images could be prepared.`,
        duration: 5000,
      });
    }

    const clipboardItems = successfulBlobs.map(blob => new ClipboardItem({ [blob.type]: blob }));

    await navigator.clipboard.write(clipboardItems);

    toast.success("Images copied!", {
      id: toastId,
      description: `You can now paste ${clipboardItems.length} images into Figma.`,
    });
  } catch (error) {
    console.error("Failed to copy images to clipboard:", error);
    
    let description = "Could not copy images. Your browser might not support this feature or there was a network issue.";
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      description = "Your browser's security settings blocked this action. If permissions are already granted, this might be a security restriction of the environment.";
      
      // Log the permission state for better debugging
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'clipboard-write' as PermissionName })
          .then(status => {
            console.log('Clipboard permission state at time of error:', status.state);
          }).catch(err => {
            console.warn('Could not query clipboard permission state at time of error:', err);
          });
      }
    } else if (error instanceof Error && error.message.includes("Could not fetch")) {
      description = "None of the images could be downloaded. Please check your network connection.";
    }

    toast.error("Failed to export to Figma", {
      id: toastId,
      description,
    });
  }
};
