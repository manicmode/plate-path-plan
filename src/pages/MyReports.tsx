
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Calendar, Loader2, Share2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from '@/hooks/useStableAuth';
import { useReportsState } from '@/hooks/useReportsState';
import { useDebouncedFetch } from '@/hooks/useDebouncedFetch';

interface ReportFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  publicUrl: string;
  weekEndDate: string;
}

const LoadingSkeleton = () => (
  <div className="space-y-8 animate-fade-in">
    {/* Latest Report Skeleton */}
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </Card>
    </div>
    
    {/* Previous Reports Skeleton */}
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = ({ onGenerateFirst, isGenerating }: { onGenerateFirst: () => void; isGenerating: boolean }) => (
  <Card className="text-center py-16 modern-action-card">
    <CardContent>
      <div className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl inline-block mb-6">
        <FileText className="w-16 h-16 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-3">No reports yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Generate your first weekly health report to start tracking your progress and insights.
      </p>
      <Button 
        onClick={onGenerateFirst} 
        disabled={isGenerating}
        size="lg"
        className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating First Report...
          </>
        ) : (
          <>
            <Plus className="w-5 h-5 mr-2" />
            Generate First Report
          </>
        )}
      </Button>
    </CardContent>
  </Card>
);

export default function MyReports() {
  const { userReady, stableUserId } = useStableAuth();
  const { state, actions } = useReportsState();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Stable utility functions
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

  // Stable fetch function
  const fetchReports = useCallback(async () => {
    if (!stableUserId || fetchingRef.current) return;
    
    fetchingRef.current = true;
    actions.setLoading(true);
    actions.setError(null);
    
    try {
      const { data: fileList, error: listError } = await supabase.storage
        .from('reports')
        .list(stableUserId, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        throw listError;
      }

      if (!isMountedRef.current) return;

      // Process files with async URL generation
      const processedReports = await Promise.all(
        (fileList || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('reports')
            .getPublicUrl(`${stableUserId}/${file.name}`);

          const weekEndMatch = file.name.match(/weekly-report-(\d{4}-\d{2}-\d{2})\.pdf/);
          const weekEndDate = weekEndMatch ? weekEndMatch[1] : '';

          return {
            ...file,
            publicUrl: urlData.publicUrl,
            weekEndDate
          };
        })
      );

      if (isMountedRef.current) {
        actions.setReports(processedReports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (isMountedRef.current) {
        actions.setError('Failed to load reports');
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive"
        });
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [stableUserId, actions, toast]);

  // Debounced fetch to prevent rapid calls
  const { debouncedFetch, cleanup } = useDebouncedFetch(fetchReports, 200);

  // Single effect with stable dependencies
  useEffect(() => {
    if (userReady && stableUserId && !state.initialized) {
      debouncedFetch();
    }

    return () => {
      cleanup();
    };
  }, [userReady, stableUserId, state.initialized, debouncedFetch, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Stable action handlers
  const generateNewReport = useCallback(async () => {
    if (!stableUserId) return;
    
    actions.setGenerating(true);
    
    try {
      const { error } = await supabase.functions.invoke('generate-and-save-weekly-health-pdf', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

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
      actions.setGenerating(false);
    }
  }, [stableUserId, actions, toast, fetchReports]);

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

  const handleShare = useCallback(async (report: ReportFile) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Weekly Health Report - ${getWeekRange(report.weekEndDate)}`,
          text: 'Check out my weekly health report!',
          url: report.publicUrl
        });
      } else {
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

  const openPreview = useCallback((report: ReportFile) => {
    actions.setSelectedReport(report);
    actions.setShowPreview(true);
  }, [actions]);

  const closePreview = useCallback(() => {
    actions.setSelectedReport(null);
    actions.setShowPreview(false);
  }, [actions]);

  const handleRetry = useCallback(() => {
    actions.resetState();
    if (userReady && stableUserId) {
      debouncedFetch();
    }
  }, [actions, userReady, stableUserId, debouncedFetch]);

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

  // Don't render anything until user is ready
  if (!userReady || !stableUserId || state.isLoading) {
    return (
      <div className="gradient-main min-h-screen flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading your reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-main">
      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 pt-2 pb-8 space-y-6">
        {/* Header Section (Top 10% height) */}
        <header className="sticky top-0 z-10 flex flex-col gap-1 px-4 pt-4 pb-2 bg-background/80 backdrop-blur mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">📄 My Reports</h1>
            <p className="text-muted-foreground mt-1">
              View and download your weekly health reports
            </p>
          </div>
          <Button 
            onClick={generateNewReport} 
            disabled={state.isGenerating}
            size="lg"
            className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {state.isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                📄 Generate New Report
              </>
            )}
          </Button>
        </header>

        {/* Loading State */}
        {state.isLoading && <LoadingSkeleton />}

        {/* Empty State */}
        {!state.isLoading && !state.error && state.reports.length === 0 && state.initialized && (
          <div className="animate-fade-in">
            <EmptyState onGenerateFirst={generateNewReport} isGenerating={state.isGenerating} />
          </div>
        )}

        {/* Reports Content */}
        {!state.isLoading && !state.error && state.reports.length > 0 && (
          <div className="space-y-8 animate-fade-in">
            {/* Most Recent Report Card (Prominent + Beautiful) */}
            {mostRecentReport && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Latest Report</h2>
                  <p className="text-sm text-muted-foreground">Your most recent weekly health summary</p>
                </div>
                
                <Card className="modern-tracker-card p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/10 border-primary/20 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 bg-primary/15 rounded-2xl">
                        <FileText className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">📅 {getWeekRange(mostRecentReport.weekEndDate)}</h3>
                        <p className="text-muted-foreground flex items-center space-x-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>Weekly Health Report</span>
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1">
                      🟢 Latest
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Generated on {formatDate(mostRecentReport.created_at)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => openPreview(mostRecentReport)}
                        className="shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        🖥️ <Eye className="w-4 h-4 ml-2" />
                        View Report
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(mostRecentReport)}
                        className="shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        ⬇️ <Download className="w-4 h-4 ml-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare(mostRecentReport)}
                        className="shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        📤 <Share2 className="w-4 h-4 ml-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {/* Previous Reports List (Compact Scrollable) */}
            {previousReports.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">📚 Previous Reports</h2>
                  <p className="text-sm text-muted-foreground">Your report history</p>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20">
                  {previousReports.map((report, index) => (
                    <Card 
                      key={`${report.id}-${index}`} 
                      className="modern-nutrient-card p-4 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 border-border/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              📅 {getWeekRange(report.weekEndDate)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center space-x-2">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(report.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreview(report)}
                            className="hover:bg-primary/10 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                            className="hover:bg-primary/10 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* PDF Preview Modal */}
        <Dialog open={state.showPreview} onOpenChange={closePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden modern-tracker-card">
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
    </div>
  );
}
