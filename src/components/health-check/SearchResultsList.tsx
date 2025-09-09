import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Star, Utensils } from 'lucide-react';
import { CanonicalSearchResult } from '@/lib/foodSearch';

interface SearchResultsListProps {
  results: CanonicalSearchResult[];
  onSelect: (result: CanonicalSearchResult) => void;
  isLoading?: boolean;
  query?: string;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  onSelect,
  isLoading = false,
  query = ''
}) => {
  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Skeleton loading list with shimmer */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-6 bg-white/5 rounded-full"></div>
                </div>
              </div>
            ))}
            <p className="text-gray-400 text-center text-sm">Searching OpenFoodFacts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="bg-orange-900/20 border-orange-400/30 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-orange-300 mb-2">No Close Matches</h3>
          <p className="text-orange-200 text-sm">
            Try a more specific term or add a brand name.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 w-full max-w-full overflow-x-hidden">
      <CardContent className="p-4 w-full max-w-full overflow-x-hidden">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2 text-rose-400" />
          Found {results.length} Result{results.length !== 1 ? 's' : ''}
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto w-full max-w-full overflow-x-hidden">
          {results.map((result, index) => (
            <Button
              key={`${result.source}-${result.id}-${index}`}
              onClick={() => onSelect(result)}
              variant="outline"
              className="w-full max-w-full min-w-0 p-4 h-auto justify-start text-left border-white/20 hover:bg-white/10 hover:border-rose-400 rounded-xl transition-all"
            >
              <div className="flex items-start space-x-3 w-full min-w-0">
                {result.imageUrl ? (
                  <img 
                    src={result.imageUrl} 
                    alt={result.name}
                    className="shrink-0 w-12 h-12 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-white truncate">{result.name}</h4>
                    {result.confidence && result.confidence > 0.8 && (
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    )}
                    <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full uppercase font-mono">
                      {result.source}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    {result.brand && (
                      <span className="truncate">{result.brand}</span>
                    )}
                    {result.caloriesPer100g && (
                      <span className="flex-shrink-0 text-green-400">{result.caloriesPer100g} cal/100g</span>
                    )}
                    {result.servingHint && (
                      <span className="text-gray-400 flex-shrink-0">{result.servingHint}</span>
                    )}
                  </div>
                  
                  {result.confidence && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs text-gray-400">Match:</span>
                      <div className="flex-1 bg-white/10 rounded-full h-1.5">
                        <div 
                          className="bg-rose-400 rounded-full h-1.5 transition-all"
                          style={{ width: `${Math.round(result.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{Math.round(result.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
        
        <p className="text-gray-400 text-xs text-center mt-4">
          Tap any result to analyze its health profile
        </p>
      </CardContent>
    </Card>
  );
};