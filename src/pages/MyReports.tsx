
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Calendar, Loader2, Share2, AlertCircle, RefreshCw } from 'lucide-react';
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

const ReportSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
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
);

const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
    <div className="text-center space-y-4">
      <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
      <p className="text-destructive">{error}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
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
  if (!userReady || !stableUserId) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <ReportSkeleton />
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

      {/* Loading State */}
      {state.isLoading && <ReportSkeleton />}

      {/* Error State */}
      {state.error && !state.isLoading && (
        <ErrorDisplay error={state.error} onRetry={handleRetry} />
      )}

      {/* No Reports State */}
      {!state.isLoading && !state.error && state.reports.length === 0 && state.initialized && (
        <Card className="text-center py-12 animate-fade-in">
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

      {/* Reports Content */}
      {!state.isLoading && !state.error && state.reports.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Most Recent Report */}
          {mostRecentReport && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Most Recent Report</h2>
                <p className="text-sm text-muted-foreground">Your latest weekly health summary</p>
              </div>
              
              <Card className="hover:shadow-lg transition-all duration-200">
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
                {previousReports.map((report, index) => (
                  <Card key={`${report.id}-${index}`} className="hover:shadow-md transition-all duration-200">
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
