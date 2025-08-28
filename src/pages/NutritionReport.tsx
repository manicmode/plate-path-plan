import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NutritionLog {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat: number;
  quality_score: number;
  quality_verdict: string;
  quality_reasons: string[];
  processing_level: string;
  ingredient_analysis: any; // Use any to handle Json type from database
  trigger_tags: string[];
  created_at: string;
  source: string;
}

export default function NutritionReport() {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { toast } = useToast();
  const [report, setReport] = useState<NutritionLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId]);

  const loadReport = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error loading report:', error);
        toast({
          title: "Error",
          description: "Failed to load nutrition report",
          variant: "destructive"
        });
        navigate('/scan-recents');
        return;
      }

      if (!data) {
        toast({
          title: "Report not found",
          description: "This nutrition report no longer exists",
          variant: "destructive"
        });
        navigate('/scan-recents');
        return;
      }

      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: "Error",
        description: "Failed to load nutrition report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Report not found</h2>
          <Button onClick={() => navigate('/scan-recents')} variant="outline" className="text-white border-white">
            Back to History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/scan-recents')}
            className="text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{report.food_name}</h1>
            <div className="flex items-center space-x-2 text-rose-100/80">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(report.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Overall Score */}
          <Card className="bg-white/10 border-white/20 md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {report.quality_score}/100
                </div>
                <Badge className={getQualityColor(report.quality_verdict) + ' text-sm'}>
                  {report.quality_verdict}
                </Badge>
                <Progress 
                  value={report.quality_score} 
                  className="mt-4 bg-white/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Macronutrients */}
          <Card className="bg-white/10 border-white/20 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Nutritional Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{report.calories}</div>
                  <div className="text-sm text-rose-100/70">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{report.protein}g</div>
                  <div className="text-sm text-rose-100/70">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{report.carbs}g</div>
                  <div className="text-sm text-rose-100/70">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{report.fat}g</div>
                  <div className="text-sm text-rose-100/70">Fat</div>
                </div>
              </div>
              
              {(report.fiber || report.sugar || report.sodium) && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {report.fiber && (
                      <div className="text-center">
                        <div className="font-semibold text-white">{report.fiber}g</div>
                        <div className="text-rose-100/70">Fiber</div>
                      </div>
                    )}
                    {report.sugar && (
                      <div className="text-center">
                        <div className="font-semibold text-white">{report.sugar}g</div>
                        <div className="text-rose-100/70">Sugar</div>
                      </div>
                    )}
                    {report.sodium && (
                      <div className="text-center">
                        <div className="font-semibold text-white">{report.sodium}mg</div>
                        <div className="text-rose-100/70">Sodium</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quality Analysis */}
          <Card className="bg-white/10 border-white/20 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Quality Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Quality Factors</h4>
                  <ul className="space-y-2">
                    {report.quality_reasons?.map((reason, index) => (
                      <li key={index} className="text-rose-100/80 text-sm flex items-start">
                        <span className="w-2 h-2 rounded-full bg-white/60 mt-1.5 mr-2 shrink-0"></span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-3">Processing Level</h4>
                  <Badge variant="outline" className="text-white border-white/30 mb-3">
                    {report.processing_level?.replace('_', ' ')}
                  </Badge>
                  
                  {report.ingredient_analysis?.flagged_ingredients?.length > 0 && (
                    <>
                      <h4 className="font-semibold text-white mb-3 mt-4">Flagged Ingredients</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.ingredient_analysis.flagged_ingredients.map((ingredient, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {ingredient}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {report.trigger_tags?.length > 0 && (
                    <>
                      <h4 className="font-semibold text-white mb-3 mt-4">Health Alerts</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.trigger_tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-white border-yellow-400 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={() => navigate('/scan-recents')}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            Back to History
          </Button>
        </div>
      </div>
    </div>
  );
}