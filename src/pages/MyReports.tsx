
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Calendar, Loader2, Share2, AlertCircle, RefreshCw } from 'lucide-react';

interface ReportFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  publicUrl: string;
  weekEndDate: string;
}

interface AppState {
  reports: ReportFile[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  selectedReport: ReportFile | null;
  showPreview: boolean;
}

const initialState: AppState = {
  reports: [],
  isLoading: true,
  isGenerating: false,
  error: null,
  selectedReport: null,
  showPreview: false
};

export default function MyReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(initialState);

  // Memoized helper functions
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const getWeekRange = useCallback((weekEndDate: string) => {
    const endDate = new Date(weekEndDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, []);

  // Batch state updates
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Optimized fetchReports with async URL generation
  const fetchReports = useCallback(async () => {
    if (!user) return;
    
    updateState({ isLoading: true, error: null });
    
    try {
      const { data: fileList, error: listError } = await supabase.storage
        .from('reports')
        .list(user.id, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        console.error('Error fetching reports:', listError);
        updateState({ 
          error: 'Failed to load reports', 
          isLoading: false 
        });
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive"
        });
        return;
      }

      // Process files with async URL generation
      const processedReports = await Promise.all(
        (fileList || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('reports')
            .getPublicUrl(`${user.id}/${file.name}`);

          // Extract week end date from filename
          const weekEndMatch = file.name.match(/weekly-report-(\d{4}-\d{2}-\d{2})\.pdf/);
          const weekEndDate = weekEndMatch ? weekEndMatch[1] : '';

          return {
            ...file,
            publicUrl: urlData.publicUrl,
            weekEndDate
          };
        })
      );

      // Single state update with all processed data
      updateState({
        reports: processedReports,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error in fetchReports:', error);
      updateState({
        error: 'Failed to load reports',
        isLoading: false
      });
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    }
  }, [user, updateState, toast]);

  // Optimized report generation
  const generateNewReport = useCallback(async () => {
    if (!user) return;
    
    updateState({ isGenerating: true });
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-and-save-weekly-health-pdf', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success! 🎉",
        description: "Your weekly report is ready!",
        duration: 5000
      });

      // Refresh reports after generation
      await fetchReports();
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      updateState({ isGenerating: false });
    }
  }, [user, updateState, toast, fetchReports]);

  // Optimized download handler
  const handleDownload = useCallback(async (report: ReportFile) => {
    try {
      const response = await fetch(report.publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-health-report-${report.weekEndDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded!",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Optimized share handler
  const handleShare = useCallback(async (report: ReportFile) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Weekly Health Report - ${getWeekRange(report.weekEndDate)}`,
          text: 'Check out my weekly health report!',
          url: report.publicUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(report.publicUrl);
        toast({
          title: "Link Copied!",
          description: "Report link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      toast({
        title: "Error",
        description: "Failed to share report",
        variant: "destructive"
      });
    }
  }, [getWeekRange, toast]);

  // Modal handlers
  const openPreview = useCallback((report: ReportFile) => {
    updateState({ selectedReport: report, showPreview: true });
  }, [updateState]);

  const closePreview = useCallback(() => {
    updateState({ selectedReport: null, showPreview: false });
  }, [updateState]);

  // Retry handler
  const handleRetry = useCallback(() => {
    fetchReports();
  }, [fetchReports]);

  // Effect with proper cleanup
  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      if (user && mounted) {
        await fetchReports();
      }
    };

    loadReports();

    return () => {
      mounted = false;
    };
  }, [user, fetchReports]);

  // Memoized computed values
  const { mostRecentReport, previousReports } = useMemo(() => {
    if (state.reports.length === 0) {
      return { mostRecentReport: null, previousReports: [] };
    }
    return {
      mostRecentReport: state.reports[0],
      previousReports: state.reports.slice(1)
    };
  }, [state.reports]);

  // Loading skeleton component
  const LoadingSkeleton = useMemo(() => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </div>
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ), []);

  // Error component
  const ErrorDisplay = useMemo(() => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-destructive">{state.error}</p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  ), [state.error, handleRetry]);

  // Render loading state
  if (state.isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        {LoadingSkeleton}
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">📄 My Reports</h1>
            <p className="text-muted-foreground mt-1">
              View and download your weekly health reports
            </p>
          </div>
          <Button 
            onClick={generateNewReport} 
            disabled={state.isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {state.isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate New Report
              </>
            )}
          </Button>
        </div>
        {ErrorDisplay}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">📄 My Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and download your weekly health reports
          </p>
        </div>
        <Button 
          onClick={generateNewReport} 
          disabled={state.isGenerating}
          className="bg-primary hover:bg-primary/90"
        >
          {state.isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate New Report
            </>
          )}
        </Button>
      </div>

      {/* No Reports State */}
      {state.reports.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No reports available yet</h3>
            <p className="text-muted-foreground mb-4">
              Your first summary will appear here soon.
            </p>
            <Button onClick={generateNewReport} disabled={state.isGenerating}>
              {state.isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate First Report'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Most Recent Report */}
      {mostRecentReport && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Most Recent Report</h2>
            <p className="text-sm text-muted-foreground">Your latest weekly health summary</p>
          </div>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Weekly Health Report
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{getWeekRange(mostRecentReport.weekEndDate)}</span>
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Latest
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Generated on {formatDate(mostRecentReport.created_at)}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(mostRecentReport)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(mostRecentReport)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(mostRecentReport)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Previous Reports */}
      {previousReports.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Previous Reports</h2>
            <p className="text-sm text-muted-foreground">Your report history</p>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {previousReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          Weekly Health Report
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Calendar className="w-3 h-3" />
                          <span>{getWeekRange(report.weekEndDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreview(report)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <Dialog open={state.showPreview} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Weekly Health Report Preview</span>
              {state.selectedReport?.weekEndDate && (
                <Badge variant="outline">
                  {getWeekRange(state.selectedReport.weekEndDate)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {state.selectedReport && (
              <iframe
                src={state.selectedReport.publicUrl}
                className="w-full h-[70vh] border border-border rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline"
              onClick={() => state.selectedReport && handleDownload(state.selectedReport)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button 
              variant="outline"
              onClick={() => state.selectedReport && handleShare(state.selectedReport)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button onClick={closePreview}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
