
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Calendar, Loader2, Share2, AlertCircle } from 'lucide-react';

interface ReportFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  publicUrl: string;
  weekEndDate: string;
}

export default function MyReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .list(user.id, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error fetching reports:', error);
        setError('Failed to load reports');
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive"
        });
        return;
      }

      const reportsWithUrls = data?.map(file => {
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
      }) || [];

      setReports(reportsWithUrls);
    } catch (error) {
      console.error('Error in fetchReports:', error);
      setError('Failed to load reports');
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewReport = async () => {
    if (!user) return;
    
    setGenerating(true);
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

      // Refresh the reports list
      await fetchReports();
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: ReportFile) => {
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
  };

  const handleShare = async (report: ReportFile) => {
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
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getWeekRange = (weekEndDate: string) => {
    const endDate = new Date(weekEndDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const mostRecentReport = reports.length > 0 ? reports[0] : null;
  const previousReports = reports.length > 1 ? reports.slice(1) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchReports} variant="outline">
            Try Again
          </Button>
        </div>
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
          disabled={generating}
          className="bg-primary hover:bg-primary/90"
        >
          {generating ? (
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
      {reports.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No reports available yet</h3>
            <p className="text-muted-foreground mb-4">
              Your first summary will appear here soon.
            </p>
            <Button onClick={generateNewReport} disabled={generating}>
              {generating ? (
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
                    onClick={() => {
                      setSelectedReport(mostRecentReport);
                      setShowPreview(true);
                    }}
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
                        onClick={() => {
                          setSelectedReport(report);
                          setShowPreview(true);
                        }}
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
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Weekly Health Report Preview</span>
              {selectedReport?.weekEndDate && (
                <Badge variant="outline">
                  {getWeekRange(selectedReport.weekEndDate)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedReport && (
              <iframe
                src={selectedReport.publicUrl}
                className="w-full h-[70vh] border border-border rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline"
              onClick={() => selectedReport && handleDownload(selectedReport)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button 
              variant="outline"
              onClick={() => selectedReport && handleShare(selectedReport)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
