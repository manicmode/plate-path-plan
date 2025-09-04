import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavedLogsMeals } from '@/components/saved/SavedLogsMeals';
import { SavedLogsSets } from '@/components/saved/SavedLogsSets';
import { listMealSets } from '@/lib/mealSets';
import { createFoodLogsBatch } from '@/api/nutritionLogs';
import { useAuth } from '@/contexts/auth';
import { useReminders } from '@/hooks/useReminders';
import { toast } from 'sonner';

export default function SavedLogs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reminders } = useReminders();
  const [searchTerm, setSearchTerm] = useState('');
  const [mealSetsCount, setMealSetsCount] = useState(0);
  
  // Parse URL type parameter
  const urlParams = new URLSearchParams(location.search);
  const urlType = urlParams.get('type');
  const [activeTab, setActiveTab] = useState<'meals' | 'sets' | 'reminders'>(
    urlType === 'sets' ? 'sets' : urlType === 'reminders' ? 'reminders' : 'meals'
  );

  // Load meal sets count
  useEffect(() => {
    listMealSets().then(sets => setMealSetsCount(sets.length)).catch(() => {});
  }, []);

  // Count meal reminders
  const mealRemindersCount = reminders.filter(r => r.type === 'meal').length;

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as 'meals' | 'sets' | 'reminders';
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
          <h1 className="text-2xl font-bold text-foreground mb-4">Saved</h1>
          
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="meals" className="text-sm">
                Meals
              </TabsTrigger>
              <TabsTrigger value="sets" className="text-sm">
                Meal Sets ({mealSetsCount})
              </TabsTrigger>
              <TabsTrigger value="reminders" className="text-sm">
                Reminders ({mealRemindersCount})
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
            
            <TabsContent value="reminders" className="mt-6">
              <div className="space-y-4">
                {reminders
                  .filter(r => r.type === 'meal')
                  .filter(r => !searchTerm || r.label.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(reminder => (
                    <div key={reminder.id} className="p-4 border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{reminder.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {reminder.frequency_type} at {reminder.reminder_time}
                          </p>
                          {reminder.food_item_data?.items && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {reminder.food_item_data.items.length} items: {' '}
                              {reminder.food_item_data.items.map((item: any) => item.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            reminder.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {reminder.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {reminders.filter(r => r.type === 'meal').length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔔</div>
                    <p className="text-muted-foreground">No meal reminders set</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create reminders from the Review screen when logging meals
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}