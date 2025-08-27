import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface BrandedCandidate {
  id: string;
  name: string;
  brand: string;
  image: string;
  confidence: number;
}

interface BrandedCandidatesListProps {
  candidates: BrandedCandidate[];
  onSelectCandidate: (candidateId: string) => void;
  onManualEntry: () => void;
  isLoading?: boolean;
}

export const BrandedCandidatesList: React.FC<BrandedCandidatesListProps> = ({
  candidates,
  onSelectCandidate,
  onManualEntry,
  isLoading = false
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-primary/10 text-primary border-primary/30';
    if (confidence >= 0.6) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
    return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-foreground">Fetching product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center">
            <span className="text-4xl mr-3">🔍</span>
            Select Product
          </h1>
          <p className="text-foreground/70 text-lg">
            We found multiple products that might match. Please select the correct one:
          </p>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id}
              className="cursor-pointer border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
              onClick={() => onSelectCandidate(candidate.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {candidate.image ? (
                      <img 
                        src={candidate.image} 
                        alt={candidate.name}
                        className="w-20 h-20 object-cover rounded-lg border border-border"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border border-border">
                        <span className="text-3xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      
                      {/* Brand */}
                      {candidate.brand && (
                        <Badge variant="outline" className="text-xs">
                          {candidate.brand}
                        </Badge>
                      )}
                      
                      {/* Product Name */}
                      <h3 className="font-semibold text-foreground text-lg leading-tight">
                        {candidate.name}
                      </h3>
                      
                      {/* Confidence */}
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(candidate.confidence)}`}>
                          {Math.round(candidate.confidence * 100)}% match
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Select Icon */}
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-primary opacity-60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Manual Entry Option */}
        <div className="text-center pt-6 border-t border-border">
          <p className="text-foreground/60 mb-4">
            Don't see your product? You can enter it manually:
          </p>
          <Button 
            variant="outline" 
            onClick={onManualEntry}
            className="px-8 py-3"
          >
            Enter Product Manually
          </Button>
        </div>
      </div>
    </div>
  );
};