
import { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";
import { ProcessingFile } from '@/components/ProcessingView';
import { v4 as uuidv4 } from 'uuid';

type CreateClustersFn = (params: {
    files: File[];
    nameToFileMap: Map<string, File>;
    onProgress: (args: { imageId: string, progress: number }) => void;
    beforeClustering: () => void;
}) => Promise<any>;

interface UseImageUploaderProps {
    createClusters: CreateClustersFn;
    onUploadStart: () => void;
    onUploadEnd: () => void;
}

export const useImageUploader = ({ createClusters, onUploadStart, onUploadEnd }: UseImageUploaderProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClustering, setIsClustering] = useState(false);
    const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            processingFiles.forEach(file => URL.revokeObjectURL(file.url));
        };
    }, [processingFiles]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const allFiles = Array.from(files);
        const maxSizeInBytes = 500 * 1024; // 500kb

        const validFiles = allFiles.filter(file => {
            if (file.size > maxSizeInBytes) {
                toast.warning(`Skipping "${file.name}"`, { description: `File is larger than 500kb.` });
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            if (allFiles.length > 0) toast.error("All selected files were over the 500kb size limit.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const nameToFileMap = new Map<string, File>();
        validFiles.forEach(file => nameToFileMap.set(file.name, file));

        const newFilesForUI = validFiles.map(file => ({
            id: uuidv4(),
            url: URL.createObjectURL(file),
            name: file.name,
            progress: 0,
        }));
        
        setProcessingFiles(newFilesForUI);
        setIsProcessing(true);
        setIsClustering(false);
        onUploadStart();
        
        toast.info("Warming up the AI... This may take a moment.");

        const onProgress = ({ imageId, progress }: { imageId: string, progress: number }) => {
            // The AI gives an ID that doesn't match our UUIDs, so we handle progress by index for now.
            // This is a simplification due to how `clusterImages` reports progress.
        };

        const onProgressByIndex = (fileIndex: number, progress: number) => {
             setProcessingFiles(prevFiles => prevFiles.map((f, i) => i === fileIndex ? { ...f, progress } : f));
        }

        // A proxy onProgress that uses the file index
        const onProgressProxy = ({ imageId, progress }: { imageId: string, progress: number }) => {
            const fileIndex = validFiles.findIndex(f => `${f.name}-${validFiles.indexOf(f)}` === imageId);
            if(fileIndex !== -1) {
                onProgressByIndex(fileIndex, progress)
            }
        };

        const beforeClustering = () => setIsClustering(true);
        
        try {
            await createClusters({ files: validFiles, nameToFileMap, onProgress: onProgressProxy, beforeClustering });
        } catch (error) {
            // Error is handled by the mutation's onError callback
        } finally {
            setIsProcessing(false);
            setIsClustering(false);
            setProcessingFiles([]);
            onUploadEnd();
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return {
        isProcessing,
        isClustering,
        processingFiles,
        fileInputRef,
        handleUploadClick,
        handleFileChange,
    };
};
