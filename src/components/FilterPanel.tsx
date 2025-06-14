
import React from 'react';
import { SlidersHorizontal, Palette, Type, Layout } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const FilterPanel = () => {
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
    <aside className="w-full md:w-64 lg:w-72 p-6 bg-card rounded-2xl shadow-soft space-y-6 animate-fade-in sticky top-24 h-fit hidden xl:block">
      <div className="flex items-center space-x-2 mb-4">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Smart Filters</h2>
      </div>

      {filterGroups.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
            <group.icon className="h-4 w-4 mr-2" />
            {group.title}
          </h3>
          <div className="space-y-2">
            {group.options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox id={option.toLowerCase().replace(" ", "-")} />
                <Label htmlFor={option.toLowerCase().replace(" ", "-")} className="text-sm font-normal text-foreground">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full">Apply Filters</Button>
    </aside>
  );
};

export default FilterPanel;
