
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { SlidersHorizontal, Palette, Type, Layout } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FilterSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // onApplyFilters: () => void; // We can add this later
}

const FilterSheet: React.FC<FilterSheetProps> = ({ isOpen, onOpenChange }) => {
  const filterGroups = [
    {
      title: "Layout Type",
      icon: Layout,
      options: ["Grid", "Single Column", "Story-style"],
    },
    {
      title: "Dominant Color/Mood",
      icon: Palette,
      options: ["Warm Tones", "Cool Tones", "Monochromatic", "Vibrant"],
    },
    {
      title: "Typography Presence",
      icon: Type,
      options: ["Serif", "Sans-serif", "Handwriting", "No Text"],
    },
  ];

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
        
        <div className="py-6 space-y-6 overflow-y-auto flex-grow pr-1"> {/* Adjusted padding for scrollbar */}
          {filterGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <group.icon className="h-4 w-4 mr-2" />
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox id={`filter-sheet-${option.toLowerCase().replace(/\s+/g, "-")}`} />
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
          <SheetClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          </SheetClose>
          <Button className="w-full sm:w-auto" onClick={() => console.log("Apply filters clicked")}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;
