import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavedLogsMeals } from '@/components/saved/SavedLogsMeals';
import { SavedLogsSets } from '@/components/saved/SavedLogsSets';
import { listMealSets } from '@/lib/mealSets';
import { createFoodLogsBatch } from '@/api/nutritionLogs';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

export default function SavedLogs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [mealSetsCount, setMealSetsCount] = useState(0);
  
  // Parse URL type parameter
  const urlParams = new URLSearchParams(location.search);
  const urlType = urlParams.get('type');
  const [activeTab, setActiveTab] = useState<'meals' | 'sets'>(
    urlType === 'sets' ? 'sets' : 'meals'
  );

  // Load meal sets count
  useEffect(() => {
    listMealSets().then(sets => setMealSetsCount(sets.length)).catch(() => {});
  }, []);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as 'meals' | 'sets';
    setActiveTab(newTab);
    
    const params = new URLSearchParams(location.search);
    params.set('type', newTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // Navigate to review with prefilled items
  const navigateToReviewWithPrefill = (items: Array<{name: string; canonicalName: string; grams: number}>) => {
    const reviewItems = items.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      canonicalName: item.canonicalName,
      portion: `${item.grams}g`,
      grams: item.grams,
      needsDetails: false
    }));
    
    navigate('/camera', { 
      state: { 
        prefilledItems: reviewItems,
        showReview: true
      }
    });
  };

  // One-tap log items
  const oneTapLog = async (items: Array<{name: string; canonicalName: string; grams: number}>) => {
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    try {
      const logItems = items.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName,
        grams: item.grams,
        source: 'meal_set',
        // Add basic nutritional estimates or placeholders
        calories: Math.round(item.grams * 2), // rough estimate
        protein: Math.round(item.grams * 0.2),
        carbs: Math.round(item.grams * 0.3),
        fat: Math.round(item.grams * 0.1),
        fiber: Math.round(item.grams * 0.05),
        sugar: Math.round(item.grams * 0.1),
        sodium: Math.round(item.grams * 0.01)
      }));

      await createFoodLogsBatch(logItems, user.id);
      toast.success("Logged ✓");
    } catch (error) {
      console.error('Failed to log meal set:', error);
      toast.error('Failed to log items');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="relative flex items-center justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/camera')}
              className="absolute left-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <Save className="h-6 w-6 text-cyan-400" />
              Saved
            </h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search saved items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="meals" className="text-sm">
                Meals
              </TabsTrigger>
              <TabsTrigger value="sets" className="text-sm">
                Meal Sets ({mealSetsCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="meals" className="mt-6">
              <SavedLogsMeals searchTerm={searchTerm} />
            </TabsContent>
            
            <TabsContent value="sets" className="mt-6">
              <SavedLogsSets 
                searchTerm={searchTerm}
                onInsert={navigateToReviewWithPrefill}
                onQuickLog={oneTapLog}
                onCountChange={setMealSetsCount}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}