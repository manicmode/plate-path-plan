import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Supplement {
  id: string;
  name: string;
  image: string;
  description: string;
  benefits: string[];
  personalReason: string;
  healthFlags: string[];
  studyLinks?: string[];
  price?: string;
}

interface SupplementListModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  supplements: Supplement[];
  onSupplementSelect: (supplement: Supplement) => void;
}

export const SupplementListModal = ({
  isOpen,
  onClose,
  categoryName,
  supplements,
  onSupplementSelect
}: SupplementListModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] glass-card border-0 rounded-3xl overflow-hidden p-0 relative" showCloseButton={false}>
        {/* Custom close button without problematic styling */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-[60] bg-background/80 backdrop-blur-sm p-1"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader className="p-6 pb-2 space-y-0">
          <DialogTitle className="text-xl font-bold">AI Recommendations</DialogTitle>
          
          {/* Personalized Header Message */}
          <div className="pt-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based on your personal health, fitness goals, and your selected category — 
              <span className="font-semibold text-primary"> {categoryName}</span> — 
              these are your recommended supplements:
            </p>
          </div>
        </DialogHeader>

        {/* Scrollable Supplement List */}
        <div className="px-6 pb-6 space-y-3 overflow-y-auto max-h-[60vh]">
          {supplements.map((supplement) => (
            <Card 
              key={supplement.id}
              className="glass-card border border-muted/20 rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              onClick={() => onSupplementSelect(supplement)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Supplement Image */}
                  <div className="text-3xl flex-shrink-0">
                    {supplement.image}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-base leading-tight">
                      {supplement.name}
                    </h3>
                    
                    {/* Optional 1-line benefit tag */}
                    {supplement.benefits[0] && (
                      <Badge variant="secondary" className="text-xs rounded-full">
                        {supplement.benefits[0]}
                      </Badge>
                    )}
                    
                    {/* Price */}
                    {supplement.price && (
                      <p className="text-sm font-medium text-primary">
                        {supplement.price}
                      </p>
                    )}
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {supplements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No supplements available for this category yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};