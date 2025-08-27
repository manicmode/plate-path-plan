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
      <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="text-white">Searching...</span>
            </div>
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
            Try adding a brand name (e.g., "Trader Joe's {query}") or check your spelling.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
      <CardContent className="p-4">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2 text-blue-400" />
          Found {results.length} Result{results.length !== 1 ? 's' : ''}
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <Button
              key={`${result.source}-${result.id}-${index}`}
              onClick={() => onSelect(result)}
              variant="outline"
              className="w-full p-4 h-auto justify-start text-left border-gray-600 hover:bg-gray-600/20 hover:border-blue-400"
            >
              <div className="flex items-start space-x-3 w-full">
                {result.imageUrl ? (
                  <img 
                    src={result.imageUrl} 
                    alt={result.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-white truncate">{result.name}</h4>
                    {result.confidence && result.confidence > 0.8 && (
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    {result.brand && (
                      <span className="truncate">{result.brand}</span>
                    )}
                    {result.caloriesPer100g && (
                      <span className="flex-shrink-0">{result.caloriesPer100g} cal/100g</span>
                    )}
                    {result.servingHint && (
                      <span className="text-gray-400 flex-shrink-0">{result.servingHint}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400 uppercase font-mono">
                      {result.source}
                    </span>
                    {result.confidence && (
                      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-blue-400 rounded-full h-1.5 transition-all"
                          style={{ width: `${Math.round(result.confidence * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
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