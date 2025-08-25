import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  isLoading?: boolean;
}

export const SupplementListModal = ({
  isOpen,
  onClose,
  categoryName,
  supplements,
  onSupplementSelect,
  isLoading = false
}: SupplementListModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md max-h-[85vh] bg-background border border-border rounded-lg p-6 z-[100] shadow-lg data-[state=open]:translate-x-[-50%] data-[state=open]:translate-y-[-50%]"
        showCloseButton={true}
      >
        {isLoading ? (
          // Loading State with Fun Animation
          <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-6">
            <div className="relative">
              {/* Spinning Brain Animation */}
              <div className="animate-spin text-6xl">🧠</div>
              {/* Pulsing Ring Effect */}
              <div className="absolute inset-0 animate-ping">
                <div className="w-16 h-16 border-4 border-primary/30 rounded-full"></div>
              </div>
            </div>
            
            {/* Loading Text with Animation */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold animate-pulse">
                Analyzing Your Health Profile...
              </h3>
              <p className="text-muted-foreground animate-fade-in">
                Consulting your neural pathways for <span className="font-semibold text-primary">{categoryName}</span>
              </p>
              
              {/* Fun Loading Facts */}
              <div className="mt-4 text-sm text-muted-foreground animate-fade-in">
                <p>💡 Personalizing recommendations based on your goals...</p>
              </div>
            </div>
          </div>
        ) : (
          // Content State
          <>
            <DialogHeader className="space-y-2 mb-4">
              <DialogTitle className="text-xl font-bold">AI Recommendations</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Based on your health goals for <span className="font-semibold text-primary">{categoryName}</span>:
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Supplement List */}
            <div className="space-y-4 overflow-y-auto max-h-[50vh] p-3">
              {supplements.map((supplement) => (
                <Card 
                  key={supplement.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors border border-border"
                  onClick={() => onSupplementSelect(supplement)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {/* Supplement Image */}
                      <div className="text-2xl flex-shrink-0">
                        {supplement.image}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-base">
                          {supplement.name}
                        </h3>
                        
                        {/* First benefit */}
                        {supplement.benefits[0] && (
                          <Badge variant="secondary" className="text-xs">
                            {supplement.benefits[0]}
                          </Badge>
                        )}
                        
                        {/* Review Summary */}
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span key={i} className="text-yellow-400 text-sm">★</span>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-1">(124 reviews)</span>
                        </div>
                        
                        {/* Price */}
                        {supplement.price && (
                          <p className="text-sm font-medium text-primary">
                            {supplement.price}
                          </p>
                        )}
                      </div>
                      
                      {/* Arrow indicator */}
                      <div className="text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};