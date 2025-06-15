
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClusterType } from '@/types';
import { ArrowRight, Loader2 } from 'lucide-react';

interface MergeClusterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cluster1: ClusterType | null;
  cluster2: ClusterType | null;
  onConfirmMerge: (newName: string) => void;
  isMerging: boolean;
}

const MergeClusterDialog: React.FC<MergeClusterDialogProps> = ({ isOpen, onOpenChange, cluster1, cluster2, onConfirmMerge, isMerging }) => {
  const [newClusterName, setNewClusterName] = useState('');

  if (!cluster1 || !cluster2) return null;

  const handleConfirm = () => {
    if (newClusterName.trim() && !isMerging) {
      onConfirmMerge(newClusterName.trim());
    }
  };
  
  const totalImages = cluster1.images.length + cluster2.images.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge Clusters</DialogTitle>
          <DialogDescription>
            You are about to merge two clusters. Please provide a new name for the merged cluster.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 my-4">
            <div className="text-center p-4 border rounded-lg flex-1 truncate">
                <p className="font-semibold truncate" title={cluster1.title}>{cluster1.title}</p>
                <p className="text-sm text-muted-foreground">{cluster1.images.length} images</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-4 border rounded-lg flex-1 truncate">
                <p className="font-semibold truncate" title={cluster2.title}>{cluster2.title}</p>
                <p className="text-sm text-muted-foreground">{cluster2.images.length} images</p>
            </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mb-4">
            The new cluster will contain {totalImages} images.
        </p>
        <Input 
          placeholder="New cluster name"
          value={newClusterName}
          onChange={(e) => setNewClusterName(e.target.value)}
          className="my-2"
          autoFocus
          disabled={isMerging}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isMerging}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!newClusterName.trim() || isMerging}>
            {isMerging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MergeClusterDialog;
