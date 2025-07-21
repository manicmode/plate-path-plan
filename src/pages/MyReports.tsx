
import { useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Calendar, Loader2, Share2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from '@/hooks/useStableAuth';
import { useReportsState } from '@/hooks/useReportsState';

interface ReportFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  publicUrl: string;
  weekEndDate: string;
}

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="modern-tracker-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28 mt-2" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex space-x-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ onGenerateFirst, isGenerating }: { onGenerateFirst: () => void; isGenerating: boolean }) => (
  <div className="text-center py-12">
    <div className="modern-action-card max-w-md mx-auto p-8">
      <div className="p-6 bg-primary/10 rounded-2xl inline-block mb-4">
        <FileText className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
      <p className="text-muted-foreground mb-6">
        Generate your first weekly health report to start tracking your progress.
      </p>
      <Button 
        onClick={onGenerateFirst} 
        disabled={isGenerating}
        className="shadow-lg hover:shadow-xl"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Generate First Report
          </>
        )}
      </Button>
    </div>
  </div>
);

export default function MyReports() {
  const { userReady, stableUserId } = useStableAuth();
  const { state, actions } = useReportsState();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Utility functions
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

  // Fetch reports function
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

      if (listError) throw listError;
      if (!isMountedRef.current) return;

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

  // Effect for fetching reports
  useEffect(() => {
    if (userReady && stableUserId && !state.initialized) {
      fetchReports();
    }
  }, [userReady, stableUserId, state.initialized, fetchReports]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Action handlers
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

  // Don't render until user is ready
  if (!userReady) {
    return (
      <div className="min-h-screen gradient-main">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-main">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">📄 My Reports</h1>
            <p className="text-muted-foreground mt-1">
              View and download your weekly health reports
            </p>
          </div>
          <Button 
            onClick={generateNewReport} 
            disabled={state.isGenerating}
            className="shrink-0 shadow-lg hover:shadow-xl"
          >
            {state.isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                📄 Generate New Report
              </>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {state.isLoading && <LoadingSkeleton />}

        {/* Error State */}
        {state.error && (
          <div className="text-center py-12">
            <div className="modern-action-card max-w-md mx-auto p-8">
              <p className="text-destructive mb-4">{state.error}</p>
              <Button onClick={() => fetchReports()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!state.isLoading && !state.error && state.reports.length === 0 && state.initialized && (
          <EmptyState onGenerateFirst={generateNewReport} isGenerating={state.isGenerating} />
        )}

        {/* Reports Content */}
        {!state.isLoading && !state.error && state.reports.length > 0 && (
          <div className="space-y-8 animate-fade-in">
            {/* Latest Report */}
            {mostRecentReport && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Latest Report</h2>
                
                <div className="modern-tracker-card p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/15 rounded-xl">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          📅 {getWeekRange(mostRecentReport.weekEndDate)}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Weekly Health Report</span>
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      🟢 Latest
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Generated on {formatDate(mostRecentReport.created_at)}
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(mostRecentReport)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        🖥️ View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(mostRecentReport)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        ⬇️ Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare(mostRecentReport)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        📤 Share
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Previous Reports */}
            {previousReports.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">📚 Previous Reports</h2>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {previousReports.map((report, index) => (
                    <div key={`${report.id}-${index}`} className="modern-nutrient-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="w-4 h-4 text-primary" />
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
                        <div className="flex space-x-2">
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
                    </div>
                  ))}
                </div>
              </section>
            )}
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
                  className="w-full h-[70vh] border rounded-lg"
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
