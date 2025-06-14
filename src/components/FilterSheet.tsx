
import React, { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { SlidersHorizontal, Palette, Tag } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FilterSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allTags: string[];
  activeFilters: { tags: string[] };
  onApplyFilters: (filters: { tags: string[] }) => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({ isOpen, onOpenChange, allTags, activeFilters, onApplyFilters }) => {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(activeFilters.tags));

  // When sheet opens, sync its state with the active filters from the page
  useEffect(() => {
    if (isOpen) {
      setSelectedTags(new Set(activeFilters.tags));
    }
  }, [isOpen, activeFilters.tags]);

  const handleTagChange = (tag: string, checked: boolean) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(tag);
      } else {
        newSet.delete(tag);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    onApplyFilters({ tags: Array.from(selectedTags) });
    onOpenChange(false);
  };
  
  const handleClear = () => {
    setSelectedTags(new Set());
  };

  const filterGroups = useMemo(() => [
    {
      title: "Tags",
      icon: Tag,
      options: allTags.sort(),
      type: 'tags'
    },
    {
      title: "Dominant Color/Mood",
      icon: Palette,
      options: ["Warm Tones", "Cool Tones", "Monochromatic", "Vibrant"],
      type: 'colors'
    },
  ], [allTags]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm md:max-w-md lg:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <SlidersHorizontal className="h-5 w-5 text-primary mr-2" />
            Smart Filters
          </SheetTitle>
          <SheetDescription>
            Refine your clustered images with these options.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6 overflow-y-auto flex-grow pr-1">
          {filterGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <group.icon className="h-4 w-4 mr-2" />
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`filter-sheet-${option.toLowerCase().replace(/\s+/g, "-")}`} 
                      checked={group.type === 'tags' ? selectedTags.has(option) : false}
                      onCheckedChange={(checked) => {
                        if (group.type === 'tags') {
                          handleTagChange(option, !!checked);
                        }
                        // NOTE: Color filtering logic is not yet implemented.
                      }}
                    />
                    <Label htmlFor={`filter-sheet-${option.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm font-normal text-foreground">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleClear}>Clear</Button>
          <Button className="w-full sm:w-auto" onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;
