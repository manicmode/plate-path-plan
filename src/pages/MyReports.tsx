import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Activity, FileText, Share, Eye, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { HabitReportSection } from "@/components/habits-report/HabitReportSection";

interface ReportData {
  id: string;
  title: string;
  summary_text: string | null;
  overall_score: number | null;
  created_at: string;
  week_start_date?: string;
  week_end_date?: string;
  month_start_date?: string;
  month_end_date?: string;
  year_start_date?: string;
  year_end_date?: string;
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

const formatReportDate = (report: ReportData, type: 'weekly' | 'monthly' | 'yearly') => {
  const monthNames = ["January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"];
  
  if (type === 'weekly' && report.week_start_date && report.week_end_date) {
    const startDate = new Date(report.week_start_date);
    const endDate = new Date(report.week_end_date);
    return `${monthNames[startDate.getMonth()]} ${startDate.getDate()} – ${monthNames[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  } else if (type === 'monthly' && report.month_start_date) {
    const date = new Date(report.month_start_date);
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  } else if (type === 'yearly' && report.year_start_date) {
    const date = new Date(report.year_start_date);
    return `${date.getFullYear()} Annual Report`;
  } else {
    const date = new Date(report.created_at);
    return date.toLocaleDateString();
  }
};

const ReportCard = ({ report, tabType }: { report: ReportData; tabType: 'weekly' | 'monthly' | 'yearly' }) => {
  const navigate = useNavigate();
  
  const handleViewReport = () => {
    navigate(`/report-viewer?id=${report.id}&type=${tabType}`);
  };

  return (
  <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-background to-muted/20 border-0 shadow-md">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
            {getReportIcon("Wellness")}
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {report.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {formatReportDate(report, tabType)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
            ✓ Complete
          </span>
          {report.overall_score && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
              Score: {Math.round(report.overall_score)}
            </span>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{report.summary_text || 'Report generated successfully'}</p>
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
          onClick={() => alert('Share link: https://voyage.app/shared/report/' + report.id + '\n\nLink copied to clipboard!')}
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("weekly");
  const [showOlderReports, setShowOlderReports] = useState<{[key: string]: boolean}>({
    weekly: false,
    monthly: false,
    yearly: false
  });
  const [reports, setReports] = useState<{
    weekly: ReportData[];
    monthly: ReportData[];
    yearly: ReportData[];
  }>({
    weekly: [],
    monthly: [],
    yearly: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const handleBackClick = () => {
    navigate(-1);
  };

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch weekly reports
        const { data: weeklyData } = await supabase
          .from('weekly_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start_date', { ascending: false });

        // Fetch monthly reports
        const { data: monthlyData } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('month_start_date', { ascending: false });

        // Fetch yearly reports
        const { data: yearlyData } = await supabase
          .from('yearly_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('year_start_date', { ascending: false });

        setReports({
          weekly: weeklyData || [],
          monthly: monthlyData || [],
          yearly: yearlyData || []
        });
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user]);

  const getVisibleReports = (tabType: 'weekly' | 'monthly' | 'yearly') => {
    const reportList = reports[tabType];
    const showOlder = showOlderReports[tabType];
    return showOlder ? reportList : reportList.slice(0, 5);
  };

  const hasOlderReports = (tabType: 'weekly' | 'monthly' | 'yearly') => {
    return reports[tabType].length > 5;
  };

  const toggleOlderReports = (tabType: string) => {
    setShowOlderReports(prev => ({
      ...prev,
      [tabType]: !prev[tabType]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
            className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-2 border-muted hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/body-scan-result')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 text-blue-700 dark:text-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            🧍‍♂️ Body Scan Analytics
          </Button>
        </div>

        {/* Custom Header */}
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            My Reports
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Your personalized health and wellness insights
          </p>
        </div>

        {/* Habit Reports Sections */}
        <div className="space-y-6 mb-8">
          <HabitReportSection period="week" />
          <HabitReportSection period="month" />
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
                <p className="text-muted-foreground">Loading weekly reports...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getVisibleReports('weekly').map((report) => (
                    <ReportCard key={report.id} report={report} tabType="weekly" />
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
                          Show Older Reports ({reports.weekly.length - 5} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading monthly reports...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getVisibleReports('monthly').map((report) => (
                    <ReportCard key={report.id} report={report} tabType="monthly" />
                  ))}
                </div>
                {hasOlderReports('monthly') && (
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      onClick={() => toggleOlderReports('monthly')}
                      className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/80 hover:to-secondary border-2 border-secondary/20 hover:border-secondary/40 transition-all duration-300 px-6 py-3 rounded-xl font-medium"
                    >
                      {showOlderReports.monthly ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Fewer Reports
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show Older Reports ({reports.monthly.length - 5} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading yearly reports...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getVisibleReports('yearly').map((report) => (
                    <ReportCard key={report.id} report={report} tabType="yearly" />
                  ))}
                </div>
                {hasOlderReports('yearly') && (
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      onClick={() => toggleOlderReports('yearly')}
                      className="bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/80 hover:to-secondary border-2 border-secondary/20 hover:border-secondary/40 transition-all duration-300 px-6 py-3 rounded-xl font-medium"
                    >
                      {showOlderReports.yearly ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Fewer Reports
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show Older Reports ({reports.yearly.length - 5} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Empty state for when no reports exist */}
        {!loading && reports[activeTab as keyof typeof reports].length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 max-w-md mx-auto">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Reports Available</h3>
              <p className="text-muted-foreground">
                No {activeTab} reports have been generated yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
