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
import { Tag, Palette, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorOptionStyles: { [key: string]: { base: string; selected: string } } = {
  "Warm Tones": {
    base: "bg-orange-200 border-orange-300 text-orange-800 hover:bg-orange-200/80",
    selected: "bg-orange-500 border-transparent text-white hover:bg-orange-500/90",
  },
  "Cool Tones": {
    base: "bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200",
    selected: "bg-blue-500 border-transparent text-white hover:bg-blue-500/90",
  },
  "Monochromatic": {
    base: "bg-gray-200 border-gray-300 text-gray-600 hover:bg-gray-300",
    selected: "bg-gray-600 border-transparent text-white hover:bg-gray-600/90",
  },
  "Vibrant": {
    base: "text-white bg-processing-gradient border-transparent bg-[length:200%_auto] hover:brightness-110 transition-all duration-300",
    selected: "text-white bg-processing-gradient border-transparent ring-2 ring-offset-2 ring-primary bg-[length:200%_auto] animate-gradient-pan",
  },
};

const tagColorClasses = [
  { base: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200/80", selected: "bg-red-500 text-white border-transparent hover:bg-red-500/90" },
  { base: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200/80", selected: "bg-sky-500 text-white border-transparent hover:bg-sky-500/90" },
  { base: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200/80", selected: "bg-emerald-500 text-white border-transparent hover:bg-emerald-500/90" },
  { base: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200/80", selected: "bg-amber-500 text-white border-transparent hover:bg-amber-500/90" },
  { base: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200/80", selected: "bg-indigo-500 text-white border-transparent hover:bg-indigo-500/90" },
  { base: "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200/80", selected: "bg-pink-500 text-white border-transparent hover:bg-pink-500/90" },
  { base: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200/80", selected: "bg-rose-500 text-white border-transparent hover:bg-rose-500/90" },
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % tagColorClasses.length;
  return tagColorClasses[index];
};

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
  
  const baseButtonClasses = "flex items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[420px] max-w-[calc(100vw-2rem)] fixed top-20 right-4 sm:right-8 left-auto m-0 !translate-x-0 !translate-y-0 rounded-2xl shadow-lg flex flex-col max-h-[calc(100dvh-8rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <SlidersHorizontal className="h-5 w-5 text-primary mr-2" />
            Smart Filters
          </DialogTitle>
          <DialogDescription>
            Refine your clustered images with these options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6 overflow-y-auto">
          {filterGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                <group.icon className="h-4 w-4 mr-2" />
                {group.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const isSelected = group.selected.has(option);
                  let buttonClasses = "";

                  if (group.title === "Tags") {
                      buttonClasses = isSelected
                          ? "bg-gray-700 text-white border-transparent hover:bg-gray-700/90"
                          : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200";
                  } else if (group.title === "Dominant Color/Mood" && colorOptionStyles[option]) {
                      buttonClasses = isSelected ? colorOptionStyles[option].selected : colorOptionStyles[option].base;
                  } else {
                      buttonClasses = isSelected
                          ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
                          : "border-input bg-transparent hover:bg-accent hover:text-accent-foreground";
                  }
  
                  return (
                    <button
                      key={option}
                      onClick={() => group.onToggle(option)}
                      className={cn(baseButtonClasses, buttonClasses)}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-auto border-t border-border pt-4">
          <Button variant="ghost" onClick={handleClearAndReload}>Clear Filters</Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
