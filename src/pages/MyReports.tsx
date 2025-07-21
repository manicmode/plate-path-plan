
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
import { cn } from '@/lib/utils';

interface ReportFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  publicUrl: string;
  weekEndDate: string;
  type: 'weekly' | 'monthly' | 'yearly';
}

type ReportTabType = 'weekly' | 'monthly' | 'yearly';

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
  
  // Tab state management
  const [activeTab, setActiveTab] = useState<ReportTabType>('weekly');

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
          const monthlyMatch = file.name.match(/monthly-report-(\d{4}-\d{2})\.pdf/);
          const yearlyMatch = file.name.match(/yearly-report-(\d{4})\.pdf/);
          
          let reportType: 'weekly' | 'monthly' | 'yearly' = 'weekly';
          let weekEndDate = '';

          if (weekEndMatch) {
            reportType = 'weekly';
            weekEndDate = weekEndMatch[1];
          } else if (monthlyMatch) {
            reportType = 'monthly';
            weekEndDate = monthlyMatch[1] + '-01'; // Use first day of month
          } else if (yearlyMatch) {
            reportType = 'yearly';
            weekEndDate = yearlyMatch[1] + '-01-01'; // Use first day of year
          }

          return {
            ...file,
            publicUrl: urlData.publicUrl,
            weekEndDate,
            type: reportType
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
    actions.setSelectedReport(report as any);
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
  const filteredReports = useMemo(() => {
    return (state.reports as ReportFile[])
      .filter(report => report.type === activeTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [state.reports, activeTab]);

  const reportTabs: { key: ReportTabType; label: string; emoji: string }[] = [
    { key: 'weekly', label: 'Weekly Reports', emoji: '📅' },
    { key: 'monthly', label: 'Monthly Reports', emoji: '📊' },
    { key: 'yearly', label: 'Yearly Reports', emoji: '📈' }
  ];

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
          <div className="w-full flex justify-center sm:justify-end mt-8 px-4">
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition duration-200 shadow-md"
              onClick={generateNewReport}
              disabled={state.isGenerating}
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
            </button>
          </div>
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
            {/* Report Type Tabs */}
            <div className="flex justify-center gap-2 mt-6">
              {reportTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-xl scale-105"
                      : "bg-background/80 backdrop-blur-sm hover:bg-background/90 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="mr-2">{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filtered Reports Display */}
            <div className="mt-8 space-y-4">
              {filteredReports.length === 0 ? (
                <Card className="text-center py-12 modern-action-card">
                  <CardContent>
                    <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl inline-block mb-4">
                      <FileText className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No {activeTab} reports yet</h3>
                    <p className="text-muted-foreground">
                      Generate your first {activeTab} report to start tracking your progress.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map((report, index) => (
                  <div key={report.id} className="modern-action-card p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {reportTabs.find(tab => tab.key === activeTab)?.emoji} {' '}
                            {activeTab === 'weekly' && getWeekRange(report.weekEndDate)}
                            {activeTab === 'monthly' && new Date(report.weekEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                            {activeTab === 'yearly' && new Date(report.weekEndDate).getFullYear()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Generated on {formatDate(report.created_at)}
                            {index === 0 && (
                              <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200 px-2 py-1 text-xs">
                                Latest
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(report)}
                          className="hover:shadow-md transition-all duration-200"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(report)}
                          className="hover:shadow-md transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare(report)}
                          className="hover:shadow-md transition-all duration-200"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                onClick={() => state.selectedReport && handleDownload(state.selectedReport as ReportFile)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                variant="outline"
                onClick={() => state.selectedReport && handleShare(state.selectedReport as ReportFile)}
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
