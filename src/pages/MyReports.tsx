
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Activity, FileText, Download, Eye } from "lucide-react";

// Mock data for reports
const mockReports = {
  weekly: [
    {
      id: 1,
      title: "Weekly Nutrition Summary",
      date: "2024-01-15",
      type: "Nutrition",
      status: "Complete",
      insights: "85% of daily protein goals met"
    },
    {
      id: 2,
      title: "Weekly Exercise Report",
      date: "2024-01-14",
      type: "Exercise",
      status: "Complete",
      insights: "4 workout sessions completed"
    },
    {
      id: 3,
      title: "Weekly Mood Analysis",
      date: "2024-01-13",
      type: "Mood",
      status: "Complete",
      insights: "Overall mood trending positive"
    }
  ],
  monthly: [
    {
      id: 4,
      title: "Monthly Health Overview",
      date: "2024-01-01",
      type: "Health",
      status: "Complete",
      insights: "Significant improvement in sleep quality"
    },
    {
      id: 5,
      title: "Monthly Nutrition Trends",
      date: "2024-01-01",
      type: "Nutrition",
      status: "Complete",
      insights: "Increased vegetable intake by 30%"
    },
    {
      id: 6,
      title: "Monthly Fitness Progress",
      date: "2024-01-01",
      type: "Exercise",
      status: "Complete",
      insights: "15% increase in strength metrics"
    }
  ],
  yearly: [
    {
      id: 7,
      title: "2023 Annual Health Report",
      date: "2023-12-31",
      type: "Health",
      status: "Complete",
      insights: "Achieved 90% of annual health goals"
    },
    {
      id: 8,
      title: "2023 Nutrition Year in Review",
      date: "2023-12-31",
      type: "Nutrition",
      status: "Complete",
      insights: "Maintained consistent healthy eating habits"
    }
  ]
};

const getReportIcon = (type: string) => {
  switch (type) {
    case "Nutrition":
      return <Activity className="h-5 w-5 text-green-500" />;
    case "Exercise":
      return <TrendingUp className="h-5 w-5 text-blue-500" />;
    case "Mood":
      return <Calendar className="h-5 w-5 text-purple-500" />;
    case "Health":
      return <FileText className="h-5 w-5 text-orange-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

const ReportCard = ({ report }: { report: any }) => (
  <Card className="hover:shadow-lg transition-shadow duration-200">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getReportIcon(report.type)}
          <div>
            <CardTitle className="text-lg">{report.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(report.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            {report.status}
          </span>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">{report.insights}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function MyReportsPage() {
  const [activeTab, setActiveTab] = useState("weekly");

  useEffect(() => {
    console.log("MyReports page loaded - tab layout active");
  }, []);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="My Reports" 
        description="Your personalized health and wellness insights" 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockReports.weekly.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockReports.monthly.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockReports.yearly.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty state for when no reports exist */}
      {mockReports[activeTab as keyof typeof mockReports].length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Reports Available</h3>
          <p className="text-muted-foreground">
            No {activeTab} reports have been generated yet.
          </p>
        </div>
      )}
    </div>
  );
}
