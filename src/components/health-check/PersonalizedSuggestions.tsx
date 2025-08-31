/**
 * Personalized Suggestions Component
 * Replaces generic AI commentary with smart, user-specific recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, ChevronDown, ChevronUp, Target, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { getCachedSuggestions, type Suggestion, type UserProfile, type SuggestionContext } from '@/lib/suggestions/suggestionEngine';
import { reasonsForTriggers } from '@/lib/health/suggestionCopy';
import type { HealthAnalysisResult } from './HealthCheckModal';

interface PersonalizedSuggestionsProps {
  result: HealthAnalysisResult;
  portionGrams?: number;
  userProfile?: UserProfile;
  className?: string;
}

export const PersonalizedSuggestions: React.FC<PersonalizedSuggestionsProps> = ({
  result,
  portionGrams,
  userProfile,
  className
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFactsOpen, setIsFactsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the context to avoid unnecessary re-renders
  const context: SuggestionContext = useMemo(() => ({
    report: result,
    user: userProfile,
    portionGrams
  }), [result, userProfile, portionGrams]);

  // Load suggestions
  useEffect(() => {
    let mounted = true;

    const loadSuggestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const suggestionList = await getCachedSuggestions(context);
        
        if (mounted) {
          setSuggestions(suggestionList);
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
        if (mounted) {
          setError('Unable to generate suggestions');
          setSuggestions([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSuggestions();
    
    return () => { mounted = false; };
  }, [context]);

  // Get suggestion icon
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'swap': return <ArrowRightLeft className="w-4 h-4" />;
      case 'portion': return <Target className="w-4 h-4" />;
      case 'combo': return <RefreshCw className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Get suggestion color
  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'swap': return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
      case 'portion': return 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400';
      case 'combo': return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
      default: return 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400';
    }
  };

  // Generate user-friendly reasons from suggestion triggers
  const reasonsList = useMemo(() => {
    const allTriggers = suggestions.flatMap(s => s.facts || []);
    
    // Build context from product data
    const ctx = {
      ingredientCount: result?.ingredientsText?.split(',').length || 0,
      sugarPerPortion: portionGrams && result?.nutritionData?.sugar 
        ? Math.round((result.nutritionData.sugar * portionGrams) / 100 * 10) / 10 
        : undefined,
      sodiumPerPortion: portionGrams && result?.nutritionData?.sodium 
        ? Math.round((result.nutritionData.sodium * portionGrams) / 100) 
        : undefined,
      satFatPerPortion: portionGrams && result?.nutritionData?.fat 
        ? Math.round((result.nutritionData.fat * portionGrams) / 100 * 10) / 10 
        : undefined,
      fiberPerPortion: portionGrams && result?.nutritionData?.fiber 
        ? Math.round((result.nutritionData.fiber * portionGrams) / 100 * 10) / 10 
        : undefined,
      proteinPerPortion: portionGrams && result?.nutritionData?.protein 
        ? Math.round((result.nutritionData.protein * portionGrams) / 100 * 10) / 10 
        : undefined,
      additives: result?.flags?.filter(f => typeof f === 'object' && f.flag?.includes('additive')).map(f => f.flag) || [],
      allergens: result?.flags?.filter(f => typeof f === 'object' && f.flag?.includes('allergen')).map(f => f.flag) || [],
      user: userProfile
    };
    
    return reasonsForTriggers(allTriggers, ctx, 2);
  }, [suggestions, result, portionGrams, userProfile]);

  if (isLoading) {
    return (
      <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Generating personalized suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Lightbulb className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground">Unable to generate suggestions at this time.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground flex items-center">
            <Lightbulb className="w-6 h-6 text-primary mr-3" />
            Smart suggestions for you
          </h3>
          
          {suggestions.length > 0 && (
            <Badge variant="secondary">
              {suggestions.length} tip{suggestions.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {suggestions.length > 0 ? (
          <div className="space-y-4">
            {/* Suggestions List */}
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border transition-all hover:shadow-sm ${getSuggestionColor(suggestion.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed font-medium">
                        {suggestion.text}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs capitalize">
                        {suggestion.type === 'swap' ? 'Alternative' :
                         suggestion.type === 'portion' ? 'Portion advice' :
                         suggestion.type === 'combo' ? 'Food pairing' : 'Health tip'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Why These Suggestions? */}
            {reasonsList.length > 0 && (
              <Collapsible open={isFactsOpen} onOpenChange={setIsFactsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm p-2">
                    <span>Why this tip?</span>
                    {isFactsOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <ul className="list-disc pl-5 space-y-1">
                      {reasonsList.map((reason, idx) => (
                        <li key={idx} className="text-sm text-foreground">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          // No specific suggestions - show neutral encouragement
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-2">
                  Balanced choice for your profile
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This product fits well within a balanced diet. Continue making mindful food choices 
                  and consider variety across your meals for optimal nutrition.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};