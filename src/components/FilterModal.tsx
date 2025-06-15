
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag, Palette, Check, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allTags: string[];
  activeFilters: { tags: string[]; colors: string[] };
  onApplyFilters: (filters: { tags: string[]; colors: string[] }) => void;
  onClear: () => void;
}

const colorOptions = ["Warm Tones", "Cool Tones", "Monochromatic", "Vibrant"];

const FilterModal: React.FC<FilterModalProps> = ({ 
  isOpen, 
  onOpenChange, 
  allTags, 
  activeFilters, 
  onApplyFilters,
  onClear,
}) => {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedTags(new Set(activeFilters.tags));
      setSelectedColors(new Set(activeFilters.colors));
    }
  }, [isOpen, activeFilters]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };
  
  const handleColorToggle = (color: string) => {
    setSelectedColors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(color)) {
        newSet.delete(color);
      } else {
        newSet.add(color);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    onApplyFilters({ 
      tags: Array.from(selectedTags),
      colors: Array.from(selectedColors),
    });
    onOpenChange(false);
  };
  
  const handleClearSelection = () => {
    setSelectedTags(new Set());
    setSelectedColors(new Set());
  };
  
  const handleClearAndReload = () => {
    onClear();
  };

  const filterGroups = useMemo(() => [
    {
      title: "Tags",
      icon: Tag,
      options: allTags.sort(),
      selected: selectedTags,
      onToggle: handleTagToggle,
    },
    {
      title: "Dominant Color/Mood",
      icon: Palette,
      options: colorOptions,
      selected: selectedColors,
      onToggle: handleColorToggle,
    },
  ], [allTags, selectedTags, selectedColors]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <SlidersHorizontal className="h-5 w-5 text-primary mr-2" />
            Smart Filters
          </DialogTitle>
          <DialogDescription>
            Refine your clustered images with these options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {filterGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                <group.icon className="h-4 w-4 mr-2" />
                {group.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const isSelected = group.selected.has(option);
  
                  return (
                    <button
                      key={option}
                      onClick={() => group.onToggle(option)}
                      className={cn(
                        "flex items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
                          : "border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-2 flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={handleClearAndReload}>Clear Filters & Refresh</Button>
            <div className='flex gap-2 w-full sm:w-auto'>
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleClearSelection}>Clear Selection</Button>
                <Button className="w-full sm:w-auto" onClick={handleApply}>Apply Filters</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
