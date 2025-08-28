import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user - showing empty state');
        setSavedReports([]);
        setLoading(false);
        return;
      }

      // DEV-only forensic logging
      if (import.meta.env.DEV) {
        const { data: sess } = await supabase.auth.getSession();
        console.log('[SAVED-REPORTS][SESSION]', { hasSession: !!sess?.session, user: sess?.session?.user?.id });
      }

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading saved reports:', error);
        toast({
          title: "Error",
          description: "Failed to load saved reports",
          variant: "destructive"
        });
        return;
      }

      console.log(`Loaded ${data?.length || 0} saved reports for user ${user.id}`);
      
      // DEV-only forensic logging
      if (import.meta.env.DEV) {
        console.log('[SAVED-REPORTS][DATASOURCE]', { source: 'db', count: data?.length || 0 });
      }
      
      setSavedReports(data || []);
    } catch (error) {
      console.error('Error loading saved reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/nutrition-report/${reportId}`);
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

        {/* Header with count */}
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="h-5 w-5 text-white" />
          <Badge variant="secondary" className="bg-white/20 text-white">
            {savedReports.length}
          </Badge>
        </div>

        {/* Saved reports list */}
        <div className="space-y-4">
          {loading ? (
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
                  No saved reports
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
          )}
        </div>
      </div>
    </div>
  );
}