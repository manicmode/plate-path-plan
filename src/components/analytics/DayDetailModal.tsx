import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format } from 'date-fns';
import { TriggerTagSelector } from '@/components/analytics/TriggerTagSelector';
import { SmartTriggerSuggestion } from '@/components/analytics/SmartTriggerSuggestion';
import { useSmartTriggerSuggestions } from '@/hooks/useSmartTriggerSuggestions';
import { 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  Pill, 
  Heart, 
  Tag,
  Calendar,
  Edit,
  Eye,
  Clock
} from 'lucide-react';

interface DayDetailData {
  meals: Array<{
    id: string;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quality_score: number;
    created_at: string;
    image_url?: string;
    trigger_tags?: string[];
  }>;
  supplements: Array<{
    id: string;
    name: string;
    dosage: number;
    unit: string;
    created_at: string;
    image_url?: string;
    trigger_tags?: string[];
  }>;
  hydration: Array<{
    id: string;
    name: string;
    volume: number;
    type: string;
    created_at: string;
    trigger_tags?: string[];
  }>;
  mood?: {
    id: string;
    mood: number;
    energy: number;
    wellness: number;
    journal_text?: string;
    ai_detected_tags?: string[];
    created_at: string;
    trigger_tags?: string[];
  };
}

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onEditMeal?: (mealId: string) => void;
  onViewDay?: (date: string) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onEditMeal,
  onViewDay
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<DayDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [openSections, setOpenSections] = useState({
    meals: true,
    supplements: true,
    hydration: true,
    mood: true
  });

  useEffect(() => {
    if (isOpen && selectedDate && user) {
      loadDayData();
    }
  }, [isOpen, selectedDate, user, refreshTrigger]);

  const handleTagsUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const loadDayData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const targetDate = new Date(selectedDate).toISOString().split('T')[0];

      // Load all data for the selected date in parallel
      const [mealsResult, supplementsResult, hydrationResult, moodResult] = await Promise.all([
        supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('supplement_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('hydration_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('mood_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', targetDate)
          .single()
      ]);

      if (mealsResult.error && mealsResult.error.code !== 'PGRST116') {
        console.error('Error loading meals:', mealsResult.error);
      }
      if (supplementsResult.error && supplementsResult.error.code !== 'PGRST116') {
        console.error('Error loading supplements:', supplementsResult.error);
      }
      if (hydrationResult.error && hydrationResult.error.code !== 'PGRST116') {
        console.error('Error loading hydration:', hydrationResult.error);
      }
      if (moodResult.error && moodResult.error.code !== 'PGRST116') {
        console.error('Error loading mood:', moodResult.error);
      }

      setData({
        meals: mealsResult.data || [],
        supplements: supplementsResult.data || [],
        hydration: hydrationResult.data || [],
        mood: moodResult.data || undefined
      });
    } catch (error) {
      console.error('Error loading day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getMoodEmoji = (score: number) => {
    if (score <= 3) return '😔';
    if (score <= 5) return '😐';
    if (score <= 7) return '🙂';
    return '😊';
  };

  const getEnergyEmoji = (score: number) => {
    if (score <= 3) return '🔋';
    if (score <= 5) return '🔋';
    if (score <= 7) return '⚡';
    return '⚡';
  };

  const getWellnessEmoji = (score: number) => {
    if (score <= 3) return '🤒';
    if (score <= 5) return '😷';
    if (score <= 7) return '💪';
    return '🌟';
  };

  const getTimeOfDay = (dateString: string): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = new Date(dateString).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Day Details - {format(new Date(selectedDate), 'MMMM d, yyyy')}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading day data...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meals Section */}
            <Collapsible 
              open={openSections.meals} 
              onOpenChange={() => toggleSection('meals')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Utensils className="h-4 w-4 text-orange-500" />
                        <span>Meals ({data?.meals.length || 0})</span>
                      </CardTitle>
                      {openSections.meals ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {data?.meals.length ? (
                      <div className="space-y-3">
                        {data.meals.map((meal) => {
                          const MealSmartSuggestion = () => {
                            const { suggestions, loading } = useSmartTriggerSuggestions({
                              itemName: meal.food_name,
                              itemType: 'nutrition',
                              timeOfDay: getTimeOfDay(meal.created_at)
                            });

                            return (
                              <SmartTriggerSuggestion
                                suggestions={suggestions}
                                loading={loading}
                                itemId={meal.id}
                                itemType="nutrition"
                                existingTags={meal.trigger_tags || []}
                                onTagsUpdate={handleTagsUpdate}
                              />
                            );
                          };

                          return (
                            <div key={meal.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">{meal.food_name}</h4>
                                  {meal.quality_score && (
                                    <Badge variant={meal.quality_score >= 7 ? 'default' : meal.quality_score >= 5 ? 'secondary' : 'destructive'}>
                                      {meal.quality_score}/10
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <span>{Math.round(meal.calories)} kcal</span>
                                  <span>{Math.round(meal.protein)}g protein</span>
                                  <span>{Math.round(meal.carbs)}g carbs</span>
                                  <span>{Math.round(meal.fat)}g fat</span>
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(meal.created_at)}</span>
                                  </span>
                                </div>
                                <div className="space-y-2 mt-2">
                                  <MealSmartSuggestion />
                                  <TriggerTagSelector
                                    existingTags={meal.trigger_tags || []}
                                    onTagsUpdate={handleTagsUpdate}
                                    itemId={meal.id}
                                    itemType="nutrition"
                                  />
                                </div>
                              </div>
                            <div className="flex items-center space-x-2">
                              {onEditMeal && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEditMeal(meal.id)}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            Total: {Math.round(data.meals.reduce((sum, meal) => sum + meal.calories, 0))} kcal, {' '}
                            {Math.round(data.meals.reduce((sum, meal) => sum + meal.protein, 0))}g protein
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No meals logged this day</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Supplements Section */}
            <Collapsible 
              open={openSections.supplements} 
              onOpenChange={() => toggleSection('supplements')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Pill className="h-4 w-4 text-blue-500" />
                        <span>Supplements ({data?.supplements.length || 0})</span>
                      </CardTitle>
                      {openSections.supplements ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {data?.supplements.length ? (
                      <div className="space-y-3">
                        {data.supplements.map((supplement) => {
                          const SupplementSmartSuggestion = () => {
                            const { suggestions, loading } = useSmartTriggerSuggestions({
                              itemName: supplement.name,
                              itemType: 'supplement',
                              timeOfDay: getTimeOfDay(supplement.created_at)
                            });

                            return (
                              <SmartTriggerSuggestion
                                suggestions={suggestions}
                                loading={loading}
                                itemId={supplement.id}
                                itemType="supplement"
                                existingTags={supplement.trigger_tags || []}
                                onTagsUpdate={handleTagsUpdate}
                              />
                            );
                          };

                          return (
                            <div key={supplement.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="flex-1">
                                <h4 className="font-medium">{supplement.name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <span>{supplement.dosage}{supplement.unit}</span>
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(supplement.created_at)}</span>
                                  </span>
                                </div>
                                <div className="space-y-2 mt-2">
                                  <SupplementSmartSuggestion />
                                  <TriggerTagSelector
                                    existingTags={supplement.trigger_tags || []}
                                    onTagsUpdate={handleTagsUpdate}
                                    itemId={supplement.id}
                                    itemType="supplement"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No supplements logged this day</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Hydration Section */}
            <Collapsible 
              open={openSections.hydration} 
              onOpenChange={() => toggleSection('hydration')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <div className="h-4 w-4 text-blue-400">💧</div>
                        <span>Hydration ({data?.hydration.length || 0})</span>
                      </CardTitle>
                      {openSections.hydration ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {data?.hydration.length ? (
                      <div className="space-y-3">
                        {data.hydration.map((item) => {
                          const HydrationSmartSuggestion = () => {
                            const { suggestions, loading } = useSmartTriggerSuggestions({
                              itemName: item.name,
                              itemType: 'hydration',
                              timeOfDay: getTimeOfDay(item.created_at)
                            });

                            return (
                              <SmartTriggerSuggestion
                                suggestions={suggestions}
                                loading={loading}
                                itemId={item.id}
                                itemType="hydration"
                                existingTags={item.trigger_tags || []}
                                onTagsUpdate={handleTagsUpdate}
                              />
                            );
                          };

                          return (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <span>{item.volume}ml</span>
                                  <span className="capitalize">{item.type}</span>
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(item.created_at)}</span>
                                  </span>
                                </div>
                                <div className="space-y-2 mt-2">
                                  <HydrationSmartSuggestion />
                                  <TriggerTagSelector
                                    existingTags={item.trigger_tags || []}
                                    onTagsUpdate={handleTagsUpdate}
                                    itemId={item.id}
                                    itemType="hydration"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            Total: {data.hydration.reduce((sum, item) => sum + item.volume, 0)}ml
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No hydration logged this day</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Mood Section */}
            <Collapsible 
              open={openSections.mood} 
              onOpenChange={() => toggleSection('mood')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <span>Mood & Wellness</span>
                      </CardTitle>
                      {openSections.mood ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {data?.mood ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 rounded-lg border bg-card">
                            <div className="text-2xl mb-1">{getMoodEmoji(data.mood.mood)}</div>
                            <div className="text-sm text-muted-foreground">Mood</div>
                            <div className="font-semibold">{data.mood.mood}/10</div>
                          </div>
                          <div className="text-center p-3 rounded-lg border bg-card">
                            <div className="text-2xl mb-1">{getEnergyEmoji(data.mood.energy)}</div>
                            <div className="text-sm text-muted-foreground">Energy</div>
                            <div className="font-semibold">{data.mood.energy}/10</div>
                          </div>
                          <div className="text-center p-3 rounded-lg border bg-card">
                            <div className="text-2xl mb-1">{getWellnessEmoji(data.mood.wellness)}</div>
                            <div className="text-sm text-muted-foreground">Wellness</div>
                            <div className="font-semibold">{data.mood.wellness}/10</div>
                          </div>
                        </div>
                        
                        {data.mood.journal_text && (
                          <div className="p-3 rounded-lg border bg-card">
                            <h5 className="font-medium mb-2">Journal Entry</h5>
                            <p className="text-sm text-muted-foreground">{data.mood.journal_text}</p>
                          </div>
                        )}
                        
                        {data.mood.ai_detected_tags && data.mood.ai_detected_tags.length > 0 && (
                          <div className="p-3 rounded-lg border bg-card">
                            <h5 className="font-medium mb-2 flex items-center space-x-2">
                              <Tag className="h-4 w-4" />
                              <span>AI-Detected Tags</span>
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {data.mood.ai_detected_tags.map((tag, index) => (
                                <Badge key={index} variant="secondary">
                                  {tag.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Mood Smart Suggestions and Manual Tags */}
                        <div className="p-3 rounded-lg border bg-card">
                          {(() => {
                            const MoodSmartSuggestion = () => {
                              const { suggestions, loading } = useSmartTriggerSuggestions({
                                itemName: data.mood?.journal_text || 'mood entry',
                                itemType: 'mood',
                                timeOfDay: getTimeOfDay(data.mood?.created_at || selectedDate)
                              });

                              return (
                                <SmartTriggerSuggestion
                                  suggestions={suggestions}
                                  loading={loading}
                                  itemId={data.mood?.id || ''}
                                  itemType="mood"
                                  existingTags={data.mood?.trigger_tags || []}
                                  onTagsUpdate={handleTagsUpdate}
                                />
                              );
                            };
                            
                            return <MoodSmartSuggestion />;
                          })()}
                          <div className="mt-2">
                            <TriggerTagSelector
                              existingTags={data.mood.trigger_tags || []}
                              onTagsUpdate={handleTagsUpdate}
                              itemId={data.mood.id}
                              itemType="mood"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No mood data logged this day</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              {onViewDay && (
                <Button
                  onClick={() => onViewDay(selectedDate)}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  View Full Day
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};