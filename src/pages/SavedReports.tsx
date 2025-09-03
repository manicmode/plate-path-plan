import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, Utensils, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SavedLogsMeals } from '@/components/saved/SavedLogsMeals';
// No mock data imports - pure DB only

interface NutritionLog {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quality_score: number;
  quality_verdict: string;
  created_at: string;
  source: string;
}

export default function SavedReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [savedReports, setSavedReports] = useState<NutritionLog[]>([]);
  const [mealSetReports, setMealSetReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'meal-sets'>('individual');

  useEffect(() => {
    loadSavedReports();
    
    // Check if tab is specified in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'meal-sets') {
      setActiveTab('meal-sets');
    }
  }, []);

  const loadSavedReports = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user - showing empty state');
        setSavedReports([]);
        setMealSetReports([]);
        setLoading(false);
        return;
      }

      const isNewSaveEnabled = import.meta.env.VITE_SAVE_SPLIT === 'true';

      if (isNewSaveEnabled) {
        // NEW BEHAVIOR: Load from saved_health_reports and saved_meal_set_reports
        console.log('[SAVED][NEW] Loading from new tables');
        
        // Load individual reports
        const { data: individualData, error: individualError } = await supabase
          .from('saved_health_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);

        if (individualError) {
          console.error('[SAVED][INDIVIDUAL][ERROR]', individualError);
        } else {
          // Map to expected format
          const mappedIndividual = (individualData || []).map(report => {
            const snapshot = report.report_snapshot as any;
            return {
              id: report.id,
              food_name: report.title,
              calories: Math.round((snapshot?.nutritionData?.calories || 0)),
              protein: Math.round((snapshot?.nutritionData?.protein || 0) * 10) / 10,
              carbs: Math.round((snapshot?.nutritionData?.carbs || 0) * 10) / 10,
              fat: Math.round((snapshot?.nutritionData?.fat || 0) * 10) / 10,
              quality_score: report.quality_score || 0,
              quality_verdict: report.quality_score >= 80 ? 'excellent' : 
                             report.quality_score >= 60 ? 'good' : 
                             report.quality_score >= 40 ? 'moderate' : 'poor',
              created_at: report.created_at,
              source: report.source
            };
          });
          setSavedReports(mappedIndividual);
        }

        // Load meal set reports
        const { data: mealSetData, error: mealSetError } = await supabase
          .from('saved_meal_set_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);

        if (mealSetError) {
          console.error('[SAVED][MEAL_SET][ERROR]', mealSetError);
        } else {
          setMealSetReports(mealSetData || []);
        }
      } else {
        // OLD BEHAVIOR: Load from nutrition_logs
        console.log('[SAVED][OLD] Loading from nutrition_logs');
        
        // @ts-ignore - New columns not in generated types yet
        const query = (supabase as any)
          .from('nutrition_logs_clean')
          .select('id, created_at, food_name, image_url, source, calories, protein, carbs, fat, quality_score, quality_verdict')
          .in('source', ['photo','barcode','vision_api','manual'])
          .not('report_snapshot', 'is', null)  // Show only snapshot-backed rows
          .order('created_at', { ascending: false })
          .limit(25);

        const { data, error } = await query;

        if (error) {
          console.error('[SAVED][QUERY][ERROR]', error);
          toast({
            title: "Error",
            description: "Failed to load saved reports",
            variant: "destructive"
          });
          return;
        }

        setSavedReports(data || []);
        setMealSetReports([]); // No meal sets in old mode
      }

      console.log('[SAVED][DATASOURCE]', { 
        source: isNewSaveEnabled ? 'new-tables' : 'nutrition_logs', 
        individualCount: savedReports?.length || 0,
        mealSetCount: mealSetReports?.length || 0 
      });
      
    } catch (error) {
      console.error('Error loading saved reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportId: string) => {
    // Navigate to the health report instead of nutrition report
    navigate(`/health-report/${reportId}`);
  };

  const getQualityColor = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700 pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/scan')}
            className="text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Saved Reports</h1>
            <p className="text-rose-100/80">View your saved health reports</p>
          </div>
        </div>

        {/* Toggle between Individual and Meal Sets */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center bg-white/10 rounded-full p-1">
            <Button
              variant={activeTab === 'individual' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('individual')}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                activeTab === 'individual' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Individual Reports
            </Button>
            <Button
              variant={activeTab === 'meal-sets' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('meal-sets')}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                activeTab === 'meal-sets' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Meal Sets
            </Button>
          </div>
        </div>

        {/* Header with count */}
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="h-5 w-5 text-white" />
          <Badge variant="secondary" className="bg-white/20 text-white">
            {activeTab === 'individual' ? savedReports.length : mealSetReports.length}
          </Badge>
          <span className="text-white/70 text-sm">
            {activeTab === 'individual' ? 'Individual meal reports' : 'Meal set reports'}
          </span>
        </div>

        {/* Content based on active tab */}
        <div className="space-y-4">
          {activeTab === 'individual' ? (
            // Individual reports content
            loading ? (
              <Card className="bg-white/10 border-white/20">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="ml-3 text-white">Loading saved reports...</span>
                </CardContent>
              </Card>
            ) : savedReports.length === 0 ? (
              <Card className="bg-white/10 border-white/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-white/50 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No individual reports
                  </h3>
                  <p className="text-rose-100/70 text-center">
                    Complete food analyses to see saved nutrition reports here
                  </p>
                  <Button
                    onClick={() => navigate('/scan')}
                    className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Start Scanning
                  </Button>
                </CardContent>
              </Card>
            ) : (
              savedReports.map((report) => (
                <Card key={report.id} className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-600 rounded-full p-2">
                          <Utensils className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white">
                              {report.food_name}
                            </h3>
                            <Badge className={getQualityColor(report.quality_verdict)}>
                              {report.quality_verdict}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-rose-100/70">
                            <span>{report.calories} cal</span>
                            <span>P: {report.protein}g</span>
                            <span>C: {report.carbs}g</span>
                            <span>F: {report.fat}g</span>
                            <span>{formatTime(report.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(report.id)}
                        className="text-white hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            // Meal sets content
            mealSetReports.length === 0 ? (
              <Card className="bg-white/10 border-white/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-white/50 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No meal set reports
                  </h3>
                  <p className="text-rose-100/70 text-center mb-4">
                    Save multi-item health reports to see them here
                  </p>
                  <Button
                    onClick={() => navigate('/scan')}
                    className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Start Scanning
                  </Button>
                </CardContent>
              </Card>
            ) : (
              mealSetReports.map((report) => (
                <Card key={report.id} className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-600 rounded-full p-2">
                          <Utensils className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white">
                              {report.name}
                            </h3>
                            <Badge className={`${
                              report.overall_score >= 80 ? 'bg-green-100 text-green-800' :
                              report.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              Score: {report.overall_score}%
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-rose-100/70">
                            <span>{report.items_snapshot?.length || 0} items</span>
                            <span>{formatTime(report.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // For now, show a toast. Later could navigate to a detailed view
                          toast({
                            title: "Meal Set Report",
                            description: `${report.name} - ${report.items_snapshot?.length || 0} items, ${report.overall_score}% health score`
                          });
                        }}
                        className="text-white hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}