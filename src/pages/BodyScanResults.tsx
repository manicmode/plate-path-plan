import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Scale, Brain, Camera, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface BodyScan {
  id: string;
  user_id: string;
  image_url: string;
  side_image_url?: string;
  back_image_url?: string;
  weight: number;
  scan_index: number;
  year: number;
  month: number;
  type: string;
  ai_insights?: string;
  ai_generated_at?: string;
  created_at: string;
}

export default function BodyScanResults() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBodyScans();
  }, []);

  const fetchBodyScans = async () => {
    try {
      console.log('[BODY SCANS] Fetching user body scan history...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view your scan history');
        setLoading(false);
        return;
      }

      // Get scans from the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data, error: fetchError } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('[BODY SCANS] Retrieved', data?.length || 0, 'scans');
      setScans(data || []);
    } catch (err) {
      console.error('[BODY SCANS] Error fetching scans:', err);
      setError('Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const calculateWeightDifference = (currentWeight: number, index: number) => {
    if (index >= scans.length - 1) return null;
    
    const previousWeight = scans[index + 1].weight;
    const diff = currentWeight - previousWeight;
    
    if (Math.abs(diff) < 0.1) return null;
    
    return {
      value: diff,
      formatted: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} lbs`,
      trend: diff > 0 ? 'up' : 'down'
    };
  };

  const getThumbnailImages = (scan: BodyScan) => {
    const images = [];
    if (scan.image_url) images.push({ url: scan.image_url, label: 'Front' });
    if (scan.side_image_url) images.push({ url: scan.side_image_url, label: 'Side' });
    if (scan.back_image_url) images.push({ url: scan.back_image_url, label: 'Back' });
    return images;
  };

  const getAIInsightPreview = (insight?: string) => {
    if (!insight) return "AI analysis not available for this scan.";
    
    // Get first 1-2 sentences
    const sentences = insight.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const preview = sentences.slice(0, 2).join('. ');
    return preview.length > 150 ? preview.substring(0, 150) + '...' : preview + '.';
  };

  const handleViewFullReport = (scan: BodyScan) => {
    navigate('/body-scan-result', {
      state: {
        date: scan.created_at,
        weight: scan.weight,
        historical: true,
        scanData: scan
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your transformation timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => navigate('/exercise-hub')} variant="outline">
              Back to Exercise Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            🕓 Your Transformation Timeline
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your progress and celebrate your journey 🔥
          </p>
        </div>

        {/* Scans List */}
        {scans.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent className="space-y-4">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">No Scans Yet</h3>
              <p className="text-muted-foreground">
                Complete your first body scan to start tracking your transformation!
              </p>
              <Button onClick={() => navigate('/body-scan-ai')}>
                Start Your First Scan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {scans.map((scan, index) => {
              const weightDiff = calculateWeightDifference(scan.weight, index);
              const images = getThumbnailImages(scan);
              const aiPreview = getAIInsightPreview(scan.ai_insights);

              return (
                <Card key={scan.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span>📈 Scan #{scan.scan_index} of {scan.year}</span>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(scan.created_at), 'MMMM d, yyyy')}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Weight and Progress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Scale className="h-5 w-5 text-secondary" />
                          <span className="font-semibold text-lg">{scan.weight} lbs</span>
                        </div>
                        
                        {weightDiff && (
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm ${
                            weightDiff.trend === 'up' 
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {weightDiff.trend === 'up' ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{weightDiff.formatted}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Thumbnails */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Scan Images</span>
                      </div>
                      <div className="flex space-x-3">
                        {images.map((image, imgIndex) => (
                          <div key={imgIndex} className="text-center">
                            <div className="w-20 h-28 bg-muted rounded-lg overflow-hidden border">
                              <img
                                src={image.url}
                                alt={`${image.label} view`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {image.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Insights Preview */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">🧠 AI Insights</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {aiPreview}
                        </p>
                        {scan.ai_insights && scan.ai_insights.length > 150 && (
                          <button
                            onClick={() => handleViewFullReport(scan)}
                            className="text-primary text-sm font-medium mt-2 hover:underline"
                          >
                            View Full Insight →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleViewFullReport(scan)}
                        className="group"
                        variant="outline"
                        size="sm"
                      >
                        View Report
                        <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                      <Button
                        onClick={() => navigate(`/body-scan-compare?compare=${scan.id}`)}
                        variant="secondary"
                        size="sm"
                        disabled={index === 0} // Can't compare most recent to itself
                      >
                        🔄 Compare
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 space-y-4">
          <Button
            onClick={() => navigate('/body-scan-ai')}
            size="lg"
            className="px-8"
          >
            📸 Take New Body Scan
          </Button>
          <p className="text-sm text-muted-foreground">
            Keep tracking your progress every 30 days for best results!
          </p>
        </div>
      </div>
    </div>
  );
}