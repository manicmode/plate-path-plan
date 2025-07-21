
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Activity, FileText, Download, Eye, ChevronDown, ChevronUp } from "lucide-react";

// Enhanced mock data for reports (12 per category)
const mockReports = {
  weekly: [
    { id: 1, title: "Weekly Nutrition Summary", date: "2025-08-12", type: "Nutrition", status: "Complete", insights: "85% of protein goal met", week: 2 },
    { id: 2, title: "Weekly Exercise Report", date: "2025-08-05", type: "Exercise", status: "Complete", insights: "4 workout sessions completed", week: 1 },
    { id: 3, title: "Weekly Mood Analysis", date: "2025-07-29", type: "Mood", status: "Complete", insights: "Overall mood trending positive", week: 4 },
    { id: 4, title: "Weekly Sleep Quality", date: "2025-07-22", type: "Wellness", status: "Complete", insights: "Average 7.5 hours quality sleep", week: 3 },
    { id: 5, title: "Weekly Hydration Report", date: "2025-07-15", type: "Nutrition", status: "Complete", insights: "Daily water goal achieved 6/7 days", week: 2 },
    { id: 6, title: "Weekly Activity Summary", date: "2025-07-08", type: "Exercise", status: "Complete", insights: "12,000 average daily steps", week: 1 },
    { id: 7, title: "Weekly Stress Levels", date: "2025-07-01", type: "Mood", status: "Complete", insights: "Stress levels decreased by 15%", week: 4 },
    { id: 8, title: "Weekly Meal Planning", date: "2025-06-24", type: "Nutrition", status: "Complete", insights: "5 healthy home-cooked meals", week: 3 },
    { id: 9, title: "Weekly Strength Training", date: "2025-06-17", type: "Exercise", status: "Complete", insights: "3 strength sessions completed", week: 2 },
    { id: 10, title: "Weekly Mindfulness", date: "2025-06-10", type: "Wellness", status: "Complete", insights: "Daily meditation streak: 7 days", week: 1 },
    { id: 11, title: "Weekly Energy Levels", date: "2025-06-03", type: "Mood", status: "Complete", insights: "Energy increased by 20%", week: 4 },
    { id: 12, title: "Weekly Supplement Tracking", date: "2025-05-27", type: "Nutrition", status: "Complete", insights: "100% supplement adherence", week: 3 }
  ],
  monthly: [
    { id: 13, title: "Monthly Health Overview", date: "2025-08-01", type: "Wellness", status: "Complete", insights: "Significant improvement in sleep quality" },
    { id: 14, title: "Monthly Nutrition Trends", date: "2025-07-01", type: "Nutrition", status: "Complete", insights: "Increased vegetable intake by 30%" },
    { id: 15, title: "Monthly Fitness Progress", date: "2025-06-01", type: "Exercise", status: "Complete", insights: "15% increase in strength metrics" },
    { id: 16, title: "Monthly Weight Management", date: "2025-05-01", type: "Wellness", status: "Complete", insights: "Lost 3lbs through healthy habits" },
    { id: 17, title: "Monthly Mood Patterns", date: "2025-04-01", type: "Mood", status: "Complete", insights: "Mood stability improved by 25%" },
    { id: 18, title: "Monthly Calorie Balance", date: "2025-03-01", type: "Nutrition", status: "Complete", insights: "Maintained caloric deficit of 300/day" },
    { id: 19, title: "Monthly Cardio Performance", date: "2025-02-01", type: "Exercise", status: "Complete", insights: "Endurance increased by 18%" },
    { id: 20, title: "Monthly Supplement Review", date: "2025-01-01", type: "Nutrition", status: "Complete", insights: "Optimized vitamin D and B12 intake" },
    { id: 21, title: "Monthly Activity Goals", date: "2024-12-01", type: "Exercise", status: "Complete", insights: "Exceeded step goals 28/31 days" },
    { id: 22, title: "Monthly Stress Management", date: "2024-11-01", type: "Mood", status: "Complete", insights: "Implemented successful coping strategies" },
    { id: 23, title: "Monthly Hydration Analysis", date: "2024-10-01", type: "Wellness", status: "Complete", insights: "Increased water intake by 40%" },
    { id: 24, title: "Monthly Meal Prep Success", date: "2024-09-01", type: "Nutrition", status: "Complete", insights: "Prepared 85% of meals at home" }
  ],
  yearly: [
    { id: 25, title: "2024 Annual Health Report", date: "2024-12-31", type: "Wellness", status: "Complete", insights: "Achieved 90% of annual health goals" },
    { id: 26, title: "2024 Nutrition Year in Review", date: "2024-12-31", type: "Nutrition", status: "Complete", insights: "Maintained consistent healthy eating habits" },
    { id: 27, title: "2024 Fitness Achievements", date: "2024-12-31", type: "Exercise", status: "Complete", insights: "Completed first marathon and 3 triathlons" },
    { id: 28, title: "2023 Annual Health Report", date: "2023-12-31", type: "Wellness", status: "Complete", insights: "Successfully improved overall wellness score by 35%" },
    { id: 29, title: "2023 Weight Loss Journey", date: "2023-12-31", type: "Nutrition", status: "Complete", insights: "Lost 25lbs and maintained healthy BMI" },
    { id: 30, title: "2023 Mental Health Progress", date: "2023-12-31", type: "Mood", status: "Complete", insights: "Reduced anxiety levels by 40%" },
    { id: 31, title: "2022 Strength Training Gains", date: "2022-12-31", type: "Exercise", status: "Complete", insights: "Increased overall strength by 50%" },
    { id: 32, title: "2022 Nutrition Optimization", date: "2022-12-31", type: "Nutrition", status: "Complete", insights: "Achieved optimal macro balance" },
    { id: 33, title: "2022 Sleep Quality Improvement", date: "2022-12-31", type: "Wellness", status: "Complete", insights: "Improved sleep efficiency to 95%" },
    { id: 34, title: "2021 Habit Formation Success", date: "2021-12-31", type: "Mood", status: "Complete", insights: "Established 8 lasting healthy habits" },
    { id: 35, title: "2021 Cardiovascular Health", date: "2021-12-31", type: "Exercise", status: "Complete", insights: "Lowered resting heart rate by 12 BPM" },
    { id: 36, title: "2021 Mindful Eating Journey", date: "2021-12-31", type: "Nutrition", status: "Complete", insights: "Developed mindful eating practices" }
  ]
};

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

const formatReportDate = (dateStr: string, type: 'weekly' | 'monthly' | 'yearly', week?: number) => {
  const date = new Date(dateStr);
  const monthNames = ["January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"];
  
  if (type === 'weekly' && week) {
    return `${monthNames[date.getMonth()]} – Week ${week} (${date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })})`;
  } else if (type === 'monthly') {
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  } else {
    return `${date.getFullYear()} Annual Report`;
  }
};

const ReportCard = ({ report, tabType }: { report: any; tabType: 'weekly' | 'monthly' | 'yearly' }) => (
  <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-background to-muted/20 border-0 shadow-md">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
            {getReportIcon(report.type)}
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {report.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {formatReportDate(report.date, tabType, report.week)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
            ✓ {report.status}
          </span>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{report.insights}</p>
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => alert('View functionality coming soon!')}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-secondary hover:text-secondary-foreground transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function MyReportsPage() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [showOlderReports, setShowOlderReports] = useState<{[key: string]: boolean}>({
    weekly: false,
    monthly: false,
    yearly: false
  });

  useEffect(() => {
    console.log("MyReports page loaded - tab layout active");
  }, []);

  const getVisibleReports = (tabType: keyof typeof mockReports) => {
    const reports = mockReports[tabType];
    const showOlder = showOlderReports[tabType];
    return showOlder ? reports : reports.slice(0, 5);
  };

  const hasOlderReports = (tabType: keyof typeof mockReports) => {
    return mockReports[tabType].length > 5;
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
        {/* Custom Header */}
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            My Reports
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Your personalized health and wellness insights
          </p>
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
                      Show Older Reports ({mockReports.weekly.length - 5} more)
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
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
                      Show Older Reports ({mockReports.monthly.length - 5} more)
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
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
                      Show Older Reports ({mockReports.yearly.length - 5} more)
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Empty state for when no reports exist */}
        {mockReports[activeTab as keyof typeof mockReports].length === 0 && (
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
