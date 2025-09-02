import React from 'react';

interface SavedLogsMealsProps {
  searchTerm: string;
}

export const SavedLogsMeals: React.FC<SavedLogsMealsProps> = ({ searchTerm }) => {
  return (
    <div className="space-y-4">
      {/* Empty state for now - this would show saved individual meal logs */}
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">Individual meal logs</div>
        <p className="text-sm text-muted-foreground">
          Feature coming soon - view and reuse your saved meal entries
        </p>
      </div>
    </div>
  );
};