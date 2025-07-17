import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User } from 'lucide-react';

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

interface SupplementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplement: Supplement | null;
  onBuyNow: (supplement: Supplement) => void;
}

export const SupplementDetailModal = ({
  isOpen,
  onClose,
  supplement,
  onBuyNow
}: SupplementDetailModalProps) => {
  if (!supplement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] bg-background border border-border rounded-2xl overflow-hidden p-0 mx-6 shadow-2xl flex flex-col justify-center">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 p-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full glass-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Supplement Details</h1>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[75vh] p-6 pb-24">
          {/* Large Image and Name */}
          <div className="text-center space-y-4">
            <div className="text-6xl">{supplement.image}</div>
            <h2 className="text-2xl font-bold">{supplement.name}</h2>
          </div>

          {/* Description */}
          <div className="space-y-2 mt-6">
            <h3 className="font-semibold text-lg text-foreground">Description</h3>
            <div className="bg-background rounded-lg p-3 border border-border shadow-sm">
              <p className="text-foreground">{supplement.description}</p>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-2 mt-6">
            <h3 className="font-semibold text-lg text-foreground">Key Benefits</h3>
            <div className="bg-background rounded-lg p-3 border border-border shadow-sm">
              <ul className="space-y-2">
                {supplement.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Personal Reason */}
          <div className="space-y-2 mt-6">
            <h3 className="font-semibold text-lg flex items-center space-x-2 text-foreground">
              <span className="text-2xl">🧠</span>
              <span>Why this is recommended for you</span>
            </h3>
            <div className="bg-background rounded-lg p-3 border border-border shadow-sm">
              <p className="text-sm text-foreground bg-primary/20 p-3 rounded-lg">
                {supplement.personalReason}
              </p>
            </div>
          </div>

          {/* Health Flags */}
          <div className="space-y-2 mt-6">
            <h3 className="font-semibold text-lg text-foreground">Health Flags</h3>
            <div className="bg-background rounded-lg p-3 border border-border shadow-sm">
              <div className="flex flex-wrap gap-2">
                {supplement.healthFlags.map((flag, index) => (
                  <Badge key={index} variant="secondary" className="rounded-full bg-background text-foreground border border-border">
                    <span className="mr-1">✅</span> {flag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-6">
            <div className="bg-background rounded-lg p-3 border border-border shadow-sm">
              <div className="flex items-center gap-2">
                {/* Stars */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              {/* Review count */}
              <div className="flex items-center gap-2 mt-1 text-sm text-foreground">
                <User className="w-4 h-4" />
                <span>124 reviews</span>
              </div>
            </div>
          </div>

          {/* Study Links */}
          {supplement.studyLinks && (
            <div className="space-y-2 mt-6">
              <h3 className="font-semibold text-lg text-foreground">Scientific Sources</h3>
              <div className="bg-background rounded-lg p-3 border border-border shadow-sm space-y-2">
                {supplement.studyLinks.map((link, index) => (
                  <a
                    key={index}
                    href={`https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary hover:underline"
                  >
                    📚 Study {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Buy Button */}
        <div className="sticky bottom-0 left-0 right-0 bg-background p-4 border-t border-border z-10">
          <Button
            onClick={() => onBuyNow(supplement)}
            className="w-full h-14 text-lg font-bold gradient-primary text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            💚 Buy Now {supplement.price && `- ${supplement.price}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};