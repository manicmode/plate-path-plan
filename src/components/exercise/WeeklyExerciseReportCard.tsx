import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subWeeks } from "date-fns";
import { Calendar, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecoveryOverviewCard } from "@/components/reports/RecoveryOverviewCard";

export function WeeklyExerciseReportCard() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["weekly-exercise-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .order("week_start_date", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data;
    },
  });

  const latestReport = reports?.[0];

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
      </Card>
    );
  }

  if (!latestReport) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Reports
          </CardTitle>
          <CardDescription>
            Your weekly reports will appear here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RecoveryOverviewCard 
        reportType="weekly" 
        reportDate={parseISO(latestReport.week_start_date)} 
      />
      
      <Card className="w-full shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {latestReport.title}
          </CardTitle>
          <CardDescription>
            Week of {format(parseISO(latestReport.week_start_date), "MMM d")} - {format(parseISO(latestReport.week_end_date), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{latestReport.summary_text}</p>
        </CardContent>
      </Card>
    </div>
  );
}