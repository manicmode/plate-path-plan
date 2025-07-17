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
      <DialogContent 
        className="max-w-md max-h-[85vh] bg-background border border-border rounded-lg p-6 z-[60]"
        showCloseButton={true}
      >
        {/* Giant debug message */}
        <div className="text-4xl text-green-500 font-bold text-center p-8">🟢 MODAL WORKS!</div>
        
        {/* Simple content */}
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Category: {categoryName}</h2>
          <p className="text-muted-foreground">Modal is now visible and working!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};