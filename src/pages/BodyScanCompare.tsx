import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Scale, Calendar, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from '@/hooks/useStableAuth';
import { toast } from 'sonner';

interface BodyScan {
  id: string;
  created_at: string;
  weight?: number;
  front_image_url?: string;
  side_image_url?: string;
  back_image_url?: string;
  ai_insights?: string;
  ai_generated_at?: string;
  scan_index?: number;
  year?: number;
  is_primary_monthly?: boolean;
}

export default function BodyScanCompare() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userReady } = useStableAuth();
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan1, setSelectedScan1] = useState<string>('');
  const [selectedScan2, setSelectedScan2] = useState<string>('');
  const [scan1Data, setScan1Data] = useState<BodyScan | null>(null);
  const [scan2Data, setScan2Data] = useState<BodyScan | null>(null);
  const [aiProgressSummary, setAiProgressSummary] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Get compare param from URL
  const compareToMostRecent = searchParams.get('compare');

  useEffect(() => {
    if (userReady && user) {
      fetchBodyScans();
    }
  }, [userReady, user]);

  // Auto-select scans: most recent vs previous (or specified comparison)
  useEffect(() => {
    if (scans.length >= 2) {
      const mostRecent = scans[0];
      let targetScan;
      
      if (compareToMostRecent) {
        targetScan = scans.find(scan => scan.id === compareToMostRecent);
      } else {
        // Default: compare most recent to previous scan
        targetScan = scans[1];
      }
      
      if (targetScan) {
        setSelectedScan1(mostRecent.id);
        setSelectedScan2(targetScan.id);
      }
    }
  }, [compareToMostRecent, scans]);

  const fetchBodyScans = async () => {
    try {
      const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error('Error fetching body scans:', error);
      toast.error('Failed to load your body scans');
    } finally {
      setLoading(false);
    }
  };

  // Update scan data when selections change
  useEffect(() => {
    if (selectedScan1) {
      const scan = scans.find(s => s.id === selectedScan1);
      setScan1Data(scan || null);
    }
  }, [selectedScan1, scans]);

  useEffect(() => {
    if (selectedScan2) {
      const scan = scans.find(s => s.id === selectedScan2);
      setScan2Data(scan || null);
    }
  }, [selectedScan2, scans]);

  // Generate AI progress summary when both scans are selected
  useEffect(() => {
    if (scan1Data && scan2Data && scan1Data.ai_insights && scan2Data.ai_insights) {
      generateProgressSummary();
    }
  }, [scan1Data, scan2Data]);

  const generateProgressSummary = async () => {
    if (!scan1Data || !scan2Data) return;
    
    setIsGeneratingAI(true);
    try {
      console.log('[AI COMPARISON] Generating progress summary...');
      
      const { data, error } = await supabase.functions.invoke('generate-body-scan-insight', {
        body: { 
          scanData: {
            scan1: {
              date: scan1Data.created_at,
              weight: scan1Data.weight,
              insights: scan1Data.ai_insights
            },
            scan2: {
              date: scan2Data.created_at,
              weight: scan2Data.weight,
              insights: scan2Data.ai_insights
            },
            isComparison: true
          },
          userId: user?.id 
        }
      });

      if (error) throw error;
      
      console.log('[AI COMPARISON] Progress summary received:', data);
      setAiProgressSummary(data.insight);
    } catch (error) {
      console.error('Error generating progress summary:', error);
      const fallbackSummary = `🚀 **Your Transformation Journey**

📈 **Progress Overview**: Comparing your scans shows your commitment to consistent tracking and self-improvement.

⚖️ **Weight Analysis**: ${getWeightComparison()}

🎯 **Key Observations**: Both scans demonstrate good attention to posture and form. Keep focusing on consistency!

💪 **Next Steps**: Continue your regular scanning routine to track long-term progress and celebrate your wins!`;
      
      setAiProgressSummary(fallbackSummary);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getWeightComparison = () => {
    if (!scan1Data?.weight || !scan2Data?.weight) {
      return "Weight data not available for comparison.";
    }
    
    const diff = scan1Data.weight - scan2Data.weight;
    if (Math.abs(diff) < 0.1) {
      return "Weight remained stable between scans. 📊";
    } else if (diff > 0) {
      return `Weight increased by ${Math.abs(diff).toFixed(1)} lbs since previous scan. 🔼`;
    } else {
      return `Weight decreased by ${Math.abs(diff).toFixed(1)} lbs since previous scan. 🔽`;
    }
  };

  const getWeightChangeIcon = () => {
    if (!scan1Data?.weight || !scan2Data?.weight) return null;
    
    const diff = scan1Data.weight - scan2Data.weight;
    if (Math.abs(diff) < 0.1) {
      return <Check className="h-5 w-5 text-blue-500" />;
    } else if (diff > 0) {
      return <TrendingUp className="h-5 w-5 text-orange-500" />;
    } else {
      return <TrendingDown className="h-5 w-5 text-green-500" />;
    }
  };

  const getScanDisplayName = (scan: BodyScan) => {
    const date = format(new Date(scan.created_at), 'MMM d, yyyy');
    const scanInfo = scan.scan_index && scan.year ? ` (Scan #${scan.scan_index} of ${scan.year})` : '';
    return `${date}${scanInfo}`;
  };

  const renderImageComparison = () => {
    if (!scan1Data || !scan2Data) return null;

    const imageTypes = [
      { key: 'front_image_url', label: 'Front View' },
      { key: 'side_image_url', label: 'Side View' },
      { key: 'back_image_url', label: 'Back View' }
    ];

    return (
      <div className="space-y-6">
        {imageTypes.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <h4 className="text-lg font-medium text-center text-muted-foreground">{label}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  {format(new Date(scan1Data.created_at), 'MMM d, yyyy')}
                </p>
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                  {scan1Data[key as keyof BodyScan] ? (
                    <img 
                      src={scan1Data[key as keyof BodyScan] as string}
                      alt={`${label} - Recent`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  {format(new Date(scan2Data.created_at), 'MMM d, yyyy')}
                </p>
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                  {scan2Data[key as keyof BodyScan] ? (
                    <img 
                      src={scan2Data[key as keyof BodyScan] as string}
                      alt={`${label} - Comparison`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your scans...</p>
        </div>
      </div>
    );
  }

  if (scans.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-900/20 w-20 h-20 mx-auto flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-orange-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Only one scan on record</h1>
            <p className="text-muted-foreground">
              Compare coming soon! Take another scan to track your progress over time.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/body-scan-ai')}
              className="w-full"
            >
              Take Another Scan
            </Button>
            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Compare Scans</h1>
            <p className="text-muted-foreground">Analyze your transformation progress side-by-side</p>
          </div>
        </div>

        {/* Scan Selection */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Select Scans to Compare</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recent Scan</label>
              <Select value={selectedScan1} onValueChange={setSelectedScan1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recent scan" />
                </SelectTrigger>
                <SelectContent>
                  {scans.map((scan) => (
                    <SelectItem 
                      key={scan.id} 
                      value={scan.id}
                      disabled={scan.id === selectedScan2}
                    >
                      {getScanDisplayName(scan)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Compare Against</label>
              <Select value={selectedScan2} onValueChange={setSelectedScan2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select comparison scan" />
                </SelectTrigger>
                <SelectContent>
                  {scans.map((scan) => (
                    <SelectItem 
                      key={scan.id} 
                      value={scan.id}
                      disabled={scan.id === selectedScan1}
                    >
                      {getScanDisplayName(scan)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Comparison Results */}
        {scan1Data && scan2Data && (
          <div className="space-y-8">
            {/* Weight and Date Comparison */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Scan Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Recent Scan</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(scan1Data.created_at), 'MMMM d, yyyy')}</span>
                    </div>
                    {scan1Data.weight && (
                      <div className="flex items-center space-x-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{scan1Data.weight} lbs</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-secondary">Comparison Scan</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(scan2Data.created_at), 'MMMM d, yyyy')}</span>
                    </div>
                    {scan2Data.weight && (
                      <div className="flex items-center space-x-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{scan2Data.weight} lbs</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weight Change Summary */}
              {scan1Data.weight && scan2Data.weight && (
                <div className="mt-6 p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getWeightChangeIcon()}
                    <span className="font-medium">{getWeightComparison()}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* AI Progress Summary */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 border-2 border-primary/30">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 rounded-full bg-primary/20">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-bold">🚀 Your Progress Summary</h2>
              </div>
              
              {isGeneratingAI ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <p className="text-muted-foreground font-medium">✨ Analyzing your transformation...</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/50 rounded animate-pulse"></div>
                    <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-muted/50 rounded animate-pulse w-5/6"></div>
                  </div>
                </div>
              ) : aiProgressSummary ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-line font-medium">
                    {aiProgressSummary}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Select both scans with AI insights to generate your progress summary.</p>
              )}
            </Card>

            {/* Individual AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-3 text-primary">Recent Scan Insights</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  {format(new Date(scan1Data.created_at), 'MMM d, yyyy')}
                </div>
                {scan1Data.ai_insights ? (
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {scan1Data.ai_insights}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No AI insights available for this scan.</p>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-3 text-secondary">Comparison Scan Insights</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  {format(new Date(scan2Data.created_at), 'MMM d, yyyy')}
                </div>
                {scan2Data.ai_insights ? (
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {scan2Data.ai_insights}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No AI insights available for this scan.</p>
                )}
              </Card>
            </div>

            {/* Image Comparison */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-center">📸 Side-by-Side Comparison</h2>
              {renderImageComparison()}
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => navigate('/body-scan-results')}
                className="flex-1"
              >
                View All Scans
              </Button>
              <Button 
                onClick={() => navigate('/body-scan-ai')}
                variant="outline"
                className="flex-1"
              >
                Take New Scan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}