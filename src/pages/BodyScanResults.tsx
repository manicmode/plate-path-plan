import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RotateCcw, Eye, Calendar, Target, TrendingUp, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek } from 'date-fns';

interface BodyScan {
  id: string;
  type: 'front' | 'side' | 'back';
  image_url: string;
  pose_score: number | null;
  created_at: string;
}

interface GroupedScans {
  front?: BodyScan;
  side?: BodyScan;
  back?: BodyScan;
}

interface WeeklyScans {
  weekStart: string;
  scans: {
    front?: BodyScan;
    side?: BodyScan;
    back?: BodyScan;
  };
}

interface ComparisonModalProps {
  currentWeek: WeeklyScans;
  previousWeek?: WeeklyScans;
  onClose: () => void;
}

export default function BodyScanResults() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<GroupedScans>({});
  const [allScans, setAllScans] = useState<BodyScan[]>([]);
  const [weeklyScans, setWeeklyScans] = useState<WeeklyScans[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyScans | null>(null);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    fetchBodyScans();
  }, []);

  const fetchBodyScans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to view your scans');
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching body scans:', error);
        toast.error('Failed to load body scans');
        return;
      }

      // Group by type and keep only the latest for each
      const grouped: GroupedScans = {};
      data?.forEach((scan) => {
        if (!grouped[scan.type as keyof GroupedScans]) {
          grouped[scan.type as keyof GroupedScans] = scan as BodyScan;
        }
      });

      setScans(grouped);
      setAllScans((data || []) as BodyScan[]);
      
      // Group all scans by week for timeline
      const weeklyGroups: { [key: string]: WeeklyScans } = {};
      (data || []).forEach((scan) => {
        const scanTyped = scan as BodyScan;
        const weekStart = startOfWeek(new Date(scanTyped.created_at), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weeklyGroups[weekKey]) {
          weeklyGroups[weekKey] = {
            weekStart: weekKey,
            scans: {}
          };
        }
        
        const scanType = scanTyped.type as keyof GroupedScans;
        if (!weeklyGroups[weekKey].scans[scanType]) {
          weeklyGroups[weekKey].scans[scanType] = scanTyped;
        }
      });
      
      const sortedWeekly = Object.values(weeklyGroups)
        .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
      
      setWeeklyScans(sortedWeekly);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load body scans');
    } finally {
      setLoading(false);
    }
  };

  const getRetakeRoute = (type: string) => {
    switch (type) {
      case 'front': return '/body-scan-ai';
      case 'side': return '/body-scan-side';
      case 'back': return '/body-scan-back';
      default: return '/body-scan-ai';
    }
  };

  const getScanTypeTitle = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getAveragePoseScore = () => {
    const scores = Object.values(scans)
      .map(scan => scan?.pose_score)
      .filter((score): score is number => score !== null && score !== undefined);
    
    if (scores.length === 0) return null;
    return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
  };

  const getLatestScanDate = () => {
    const dates = Object.values(scans)
      .map(scan => scan?.created_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    
    return dates[0] ? new Date(dates[0]) : null;
  };

  const scanCount = Object.keys(scans).length;
  const averageScore = getAveragePoseScore();
  const latestDate = getLatestScanDate();

  const generateAIFeedback = (current: WeeklyScans, previous?: WeeklyScans) => {
    if (!previous) return "This is your first scan week. Great start on your journey!";
    
    const currentAvg = Object.values(current.scans)
      .map(s => s?.pose_score || 0)
      .reduce((a, b) => a + b, 0) / 3;
    const previousAvg = Object.values(previous.scans)
      .map(s => s?.pose_score || 0)
      .reduce((a, b) => a + b, 0) / 3;
    
    const improvement = currentAvg - previousAvg;
    
    if (improvement > 0.5) {
      return `Excellent progress! Your posture improved by ${improvement.toFixed(1)} points. Keep up the great work!`;
    } else if (improvement > 0) {
      return `Nice improvement! Your posture is getting better with a ${improvement.toFixed(1)} point increase.`;
    } else if (improvement > -0.5) {
      return `You're maintaining consistent posture. Small fluctuations are normal - keep it up!`;
    } else {
      return `Focus on form this week. Consider reviewing your posture tips and retaking scans.`;
    }
  };

  const exportComparison = async (current: WeeklyScans, previous?: WeeklyScans) => {
    toast.success('Comparison exported! (Feature coming soon)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="visible-card">
                <CardHeader>
                  <Skeleton className="h-6 w-16" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-[3/4] w-full mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/exercise-hub')}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Body Scan Results</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Latest Scans</TabsTrigger>
            <TabsTrigger value="timeline">Progress Timeline 📈</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-8">
            {/* Scan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['front', 'side', 'back'].map((type) => {
            const scan = scans[type as keyof GroupedScans];
            
            return (
              <Card key={type} className="visible-card hover:bg-accent/5 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-center">
                    {getScanTypeTitle(type)} View
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scan ? (
                    <>
                      {/* Thumbnail */}
                      <div className="relative group">
                        <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors">
                          <img
                            src={scan.image_url}
                            alt={`${type} body scan`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/20"
                              onClick={() => setSelectedImage(scan.image_url)}
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Scan Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(scan.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        {scan.pose_score && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span>Score: {scan.pose_score.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Retake Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(getRetakeRoute(type))}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retake
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Empty State */}
                      <div className="aspect-[3/4] bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">No scan yet</p>
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={() => navigate(getRetakeRoute(type))}
                      >
                        Take {getScanTypeTitle(type)} Scan
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
            </div>

            {/* Summary Section */}
            {scanCount > 0 && (
          <Card className="visible-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-center">
                ✅ Scan Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">Total Scans</p>
                  <p className="text-muted-foreground">{scanCount} of 3</p>
                </div>
                {averageScore && (
                  <div>
                    <p className="font-medium text-foreground">Average Score</p>
                    <p className="text-muted-foreground">{averageScore}/10</p>
                  </div>
                )}
                {latestDate && (
                  <div>
                    <p className="font-medium text-foreground">Last Scan</p>
                    <p className="text-muted-foreground">{format(latestDate, 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-accent/10 rounded-lg">
                <p className="text-foreground font-medium mb-2">
                  {scanCount === 3 
                    ? "Great job completing all three scans! 🎉" 
                    : `You're ${scanCount}/3 of the way there! Keep it up! 💪`}
                </p>
                <p className="text-muted-foreground text-sm">
                  {scanCount === 3 
                    ? "You can retake any scan to track your progress over time." 
                    : "Complete all three views for the full body scan experience."}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate('/exercise-hub')}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Exercise Hub
              </Button>
            </CardContent>
          </Card>
            )}

            {/* No Scans State */}
            {scanCount === 0 && (
              <Card className="visible-card text-center">
                <CardContent className="pt-8 pb-8">
                  <div className="space-y-4">
                    <div className="text-6xl">📱</div>
                    <h2 className="text-xl font-semibold text-foreground">No Scans Yet</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Start your body scanning journey! Capture three views to get a complete picture of your progress.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate('/body-scan-ai')}
                      className="mt-6"
                    >
                      Start First Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="timeline" className="space-y-6">
            {weeklyScans.length > 0 ? (
              <>
                <Card className="visible-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Progress Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto pb-4">
                      <div className="flex gap-6 min-w-fit">
                        {weeklyScans.map((week, index) => (
                          <div key={week.weekStart} className="flex flex-col items-center min-w-[120px]">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              {format(new Date(week.weekStart), 'MMM d')}
                            </div>
                            <div className="relative">
                              <div className="grid grid-cols-3 gap-1 p-2 border-2 border-primary/20 rounded-lg bg-card hover:border-primary/40 transition-colors cursor-pointer"
                                   onClick={() => setSelectedWeek(week)}>
                                {['front', 'side', 'back'].map((type) => {
                                  const scan = week.scans[type as keyof GroupedScans];
                                  return (
                                    <div key={type} className="w-8 h-10 rounded bg-muted overflow-hidden">
                                      {scan ? (
                                        <img
                                          src={scan.image_url}
                                          alt={`${type} mini`}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-muted-foreground/20" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {index < weeklyScans.length - 1 && (
                                <div className="absolute top-1/2 -right-3 w-6 h-0.5 bg-primary/30" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="visible-card text-center">
                <CardContent className="pt-8 pb-8">
                  <div className="space-y-4">
                    <div className="text-6xl">📈</div>
                    <h2 className="text-xl font-semibold text-foreground">Start Your Progress Journey</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Start scanning regularly to track progress! Take scans weekly to see your improvement over time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {/* Full Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-3xl max-h-full">
            <img
              src={selectedImage}
              alt="Full size body scan"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Progress Comparison Modal */}
      {selectedWeek && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Week of {format(new Date(selectedWeek.weekStart), 'MMM d, yyyy')}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedWeek(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full Size Images */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['front', 'side', 'back'].map((type) => {
                  const scan = selectedWeek.scans[type as keyof GroupedScans];
                  return (
                    <div key={type} className="space-y-2">
                      <h3 className="font-medium text-center">{getScanTypeTitle(type)} View</h3>
                      <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden border-2 border-primary/20">
                        {scan ? (
                          <img
                            src={scan.image_url}
                            alt={`${type} scan`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No scan available
                          </div>
                        )}
                      </div>
                      {scan?.pose_score && (
                        <p className="text-center text-sm text-muted-foreground">
                          Score: {scan.pose_score.toFixed(1)}/10
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Feedback */}
              <div className="p-4 bg-accent/10 rounded-lg">
                <h3 className="font-medium mb-2">📊 AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  {generateAIFeedback(
                    selectedWeek,
                    weeklyScans.find((w, index) => 
                      weeklyScans.indexOf(selectedWeek) === index - 1
                    )
                  )}
                </p>
              </div>

              {/* Export Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => exportComparison(
                    selectedWeek,
                    weeklyScans.find((w, index) => 
                      weeklyScans.indexOf(selectedWeek) === index - 1
                    )
                  )}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Comparison
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
