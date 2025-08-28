import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Trash2, Eye, BookOpen, Utensils, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getScanRecents, clearScanRecents, removeScanRecent } from '@/lib/scanRecents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@/lib/clearMockData'; // Force clear any mock data

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

export default function ScanRecents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recents, setRecents] = useState(getScanRecents());
  const [savedReports, setSavedReports] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');

  useEffect(() => {
    setRecents(getScanRecents());
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

  const handleClearAll = () => {
    clearScanRecents();
    setRecents([]);
    toast({
      title: "Recents cleared",
      description: "All recent scans have been removed.",
    });
  };

  const handleRemoveItem = (ts: number) => {
    removeScanRecent(ts);
    setRecents(getScanRecents());
    toast({
      title: "Item removed",
      description: "Recent scan removed from history.",
    });
  };

  const handleViewReport = (reportId: string) => {
    // Navigate to a detailed view of the nutrition report
    navigate(`/nutrition-report/${reportId}`);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'barcode': return '📱';
      case 'photo': return '📸';
      case 'manual': return '⌨️';
      case 'voice': return '🎤';
      default: return '📊';
    }
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

  const formatTime = (ts: number | string) => {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
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
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900">
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
            <h1 className="text-3xl font-bold text-white">Scan History</h1>
            <p className="text-rose-100/80">Recent scans and saved reports</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border-white/20">
            <TabsTrigger 
              value="recent" 
              className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
            >
              <Clock className="h-4 w-4 mr-2" />
              Recent Scans
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                {recents.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Saved Reports
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                {savedReports.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Recent Scans Tab */}
          <TabsContent value="recent" className="mt-6">
            {/* Clear all button */}
            {recents.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}

            {/* Recents list */}
            <div className="space-y-4">
            {recents.length === 0 ? (
              <Card className="bg-white/10 border-white/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-white/50 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No recent scans
                  </h3>
                  <p className="text-rose-100/70 text-center">
                    Start scanning foods to see your history here
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
              recents.map((item) => (
                <Card key={item.ts} className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getModeIcon(item.mode)}</span>
                        <div>
                          <h3 className="font-semibold text-white">
                            {item.label}
                          </h3>
                          <p className="text-sm text-rose-100/70">
                            {item.mode} • {formatTime(item.ts)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Rescan - navigate to health analysis with the same item
                            if (item.mode === 'voice') {
                              navigate(`/scan?modal=health&source=voice&name=${encodeURIComponent(item.label)}`);
                            } else if (item.mode === 'barcode' && item.id) {
                              navigate(`/scan?modal=health&source=barcode&barcode=${encodeURIComponent(item.id)}`);
                            } else {
                              navigate(`/scan?modal=manual&query=${encodeURIComponent(item.label)}`);
                            }
                          }}
                          className="text-white hover:bg-white/10"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.ts)}
                          className="text-white hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            </div>
          </TabsContent>

          {/* Saved Reports Tab */}
          <TabsContent value="saved" className="mt-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}