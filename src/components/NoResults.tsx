
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';

interface NoResultsProps {
  onAdjustFilters: () => void;
}

const NoResults = ({ onAdjustFilters }: NoResultsProps) => {
  return (
    <div className="text-center py-16 flex flex-col items-center">
      <Frown className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-xl font-semibold text-foreground">No clusters match your filters</h3>
      <p className="text-muted-foreground mt-2 max-w-sm">Try adjusting or clearing your filters to see more results.</p>
      <Button variant="outline" onClick={onAdjustFilters} className="mt-4">
        Adjust Filters
      </Button>
    </div>
  );
};

export default NoResults;
