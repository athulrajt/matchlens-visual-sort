
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClusterColorPaletteProps {
  palette: string[];
  onColorCopy: (e: React.MouseEvent, color: string) => void;
}

const ClusterColorPalette: React.FC<ClusterColorPaletteProps> = ({ palette, onColorCopy }) => {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Dominant Colors:</p>
      <TooltipProvider>
        <div className="flex items-center space-x-2 h-6">
          {palette.map((color, index) => (
            <Tooltip key={index} delayDuration={100}>
              <TooltipTrigger asChild>
                <div
                  className="h-6 w-6 rounded-full border-2 border-white/50 shadow-sm cursor-pointer transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={(e) => onColorCopy(e, color)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy {color}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default ClusterColorPalette;
