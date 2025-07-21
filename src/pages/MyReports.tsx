
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Activity, FileText, Share, Eye, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyReport {
  id: string;
  title: string;
  week_start_date: string;
  week_end_date: string;
  summary_text: string;
  overall_score: number;
  report_data: any;
  created_at: string;
}

const getReportIcon = (type: string) => {
  switch (type) {
    case "Nutrition":
      return <Activity className="h-5 w-5 text-emerald-500" />;
    case "Exercise":
      return <TrendingUp className="h-5 w-5 text-blue-500" />;
    case "Mood":
      return <Calendar className="h-5 w-5 text-purple-500" />;
    case "Wellness":
      return <FileText className="h-5 w-5 text-orange-500" />;
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
};

const formatReportDate = (weekStartDate: string, weekEndDate: string) => {
  const start = new Date(weekStartDate);
  const end = new Date(weekEndDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"];
  
  const month = monthNames[start.getMonth()];
  const weekNumber = Math.ceil(start.getDate() / 7);
  
  return `${month} – Week ${weekNumber} (${start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })})`;
};

const ReportCard = ({ report }: { report: WeeklyReport }) => {
  const navigate = useNavigate();
  
  const handleViewReport = () => {
    navigate(`/report/${report.id}`, { 
      state: { 
        report: {
          ...report,
          type: "Nutrition", // Default type for now
          status: "Complete"
        },
        tabType: "weekly",
        title: report.title,
        date: formatReportDate(report.week_start_date, report.week_end_date)
      } 
    });
  };

  return (
  <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-background to-muted/20 border-0 shadow-md">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
            {getReportIcon("Nutrition")}
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {report.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {formatReportDate(report.week_start_date, report.week_end_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
            ✓ Complete
          </span>
          {report.overall_score && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {Math.round(report.overall_score)}/100
            </span>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{report.summary_text || 'No summary available'}</p>
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={handleViewReport}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-secondary hover:text-secondary-foreground transition-colors"
          onClick={() => alert('Share link: https://nutricoach.app/shared/report/' + report.id + '\n\nLink copied to clipboard!')}
        >
          <Share className="h-4 w-4" />
          Share
        </Button>
      </div>
    </CardContent>
  </Card>
  );
};

export default function MyReportsPage() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOlderReports, setShowOlderReports] = useState<{[key: string]: boolean}>({
    weekly: false,
    monthly: false,
    yearly: false
  });

  useEffect(() => {
    console.log("MyReports page loaded - fetching weekly reports");
    fetchWeeklyReports();
  }, []);

  const fetchWeeklyReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: reports, error: fetchError } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(20);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setWeeklyReports(reports || []);
    } catch (err) {
      console.error('Error fetching weekly reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const getVisibleReports = (tabType: string) => {
    if (tabType === 'weekly') {
      const showOlder = showOlderReports[tabType];
      return showOlder ? weeklyReports : weeklyReports.slice(0, 5);
    }
    // For now, monthly and yearly will show empty until we implement them
    return [];
  };

  const hasOlderReports = (tabType: string) => {
    if (tabType === 'weekly') {
      return weeklyReports.length > 5;
    }
    return false;
  };

  const toggleOlderReports = (tabType: string) => {
    setShowOlderReports(prev => ({
      ...prev,
      [tabType]: !prev[tabType]
    }));
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-weekly-reports');
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('Report generation triggered:', data);
      
      // Refresh the reports after generation
      await fetchWeeklyReports();
      
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        {/* Custom Header */}
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            My Reports
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Your personalized health and wellness insights
          </p>
          <div className="flex justify-center gap-3">
            <Button 
              onClick={handleGenerateReport} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate New Report
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gradient-to-r from-muted/50 to-muted/30 p-1 rounded-xl h-12">
            <TabsTrigger 
              value="weekly" 
              className="rounded-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300"
            >
              Weekly
            </TabsTrigger>
            <TabsTrigger 
              value="monthly"
              className="rounded-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300"
            >
              Monthly
            </TabsTrigger>
            <TabsTrigger 
              value="yearly"
              className="rounded-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300"
            >
              Yearly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="bg-red-50 p-4 rounded-lg max-w-md mx-auto">
                  <p className="text-red-800 font-medium">Error loading reports</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                  <Button onClick={fetchWeeklyReports} className="mt-3">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : getVisibleReports('weekly').length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 max-w-md mx-auto">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Weekly Reports Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first weekly report to see your health insights.
                  </p>
                  <Button onClick={handleGenerateReport} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generate Report
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getVisibleReports('weekly').map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
                {hasOlderReports('weekly') && (
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      onClick={() => toggleOlderReports('weekly')}
                      className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/80 hover:to-secondary border-2 border-secondary/20 hover:border-secondary/40 transition-all duration-300 px-6 py-3 rounded-xl font-medium"
                    >
                      {showOlderReports.weekly ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Fewer Reports
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show Older Reports ({weeklyReports.length - 5} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 max-w-md mx-auto">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Monthly reports will be available in a future update.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 max-w-md mx-auto">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Yearly reports will be available in a future update.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
