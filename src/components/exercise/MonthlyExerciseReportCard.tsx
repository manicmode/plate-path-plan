import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar, Trophy, Clock, Flame, Target, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyExerciseReport {
  id: string;
  month_start: string;
  month_end: string;
  total_workouts_completed: number;
  days_skipped: number;
  total_duration_minutes: number;
  total_calories_burned: number;
  most_frequent_muscle_groups: string[];
  missed_target_areas: string[];
  motivational_title: string;
  personalized_message: string;
  smart_suggestions: string;
  report_data: {
    daily_breakdown?: Record<string, any>;
    activity_breakdown?: Record<string, number>;
    weekly_averages?: {
      workouts_per_week: number;
      duration_per_week: number;
      calories_per_week: number;
    };
  };
  created_at: string;
}

export function MonthlyExerciseReportCard() {
  const [selectedReport, setSelectedReport] = useState<MonthlyExerciseReport | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["monthly-exercise-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_exercise_reports")
        .select("*")
        .order("month_start", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as MonthlyExerciseReport[];
    },
  });

  const latestReport = reports?.[0];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMotivationColor = (workouts: number) => {
    if (workouts >= 20) return "bg-gradient-to-r from-purple-500 to-pink-500";
    if (workouts >= 12) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (workouts >= 6) return "bg-gradient-to-r from-blue-500 to-cyan-500";
    return "bg-gradient-to-r from-orange-500 to-red-500";
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestReport) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Monthly Exercise Report
          </CardTitle>
          <CardDescription>
            Your first monthly report will be generated after completing some workouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Keep logging your workouts to see your monthly fitness summary with insights and motivation!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full shadow-lg bg-card border-2 border-slate-500/60 bg-gradient-to-r from-slate-500/30 to-gray-500/30 relative overflow-hidden">
        <div className={`absolute inset-0 opacity-10 ${getMotivationColor(latestReport.total_workouts_completed)}`} />
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {latestReport.motivational_title}
          </CardTitle>
          <CardDescription>
            {format(parseISO(latestReport.month_start), "MMMM yyyy")} Fitness Summary
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">
              {latestReport.personalized_message}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{latestReport.total_workouts_completed}</span>
                </div>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">
                    {formatDuration(latestReport.total_duration_minutes)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {latestReport.most_frequent_muscle_groups.slice(0, 3).map((activity) => (
                <Badge key={activity} variant="secondary" className="text-xs">
                  {activity}
                </Badge>
              ))}
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" onClick={() => setSelectedReport(latestReport)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Full Report
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                {selectedReport && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-xl">
                        {selectedReport.motivational_title}
                      </DialogTitle>
                      <DialogDescription>
                        Complete fitness report for {format(parseISO(selectedReport.month_start), "MMMM yyyy")}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      {/* Key Metrics */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Key Metrics
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                            <div className="text-2xl font-bold">{selectedReport.total_workouts_completed}</div>
                            <div className="text-xs text-muted-foreground">Workouts</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                            <div className="text-2xl font-bold">{formatDuration(selectedReport.total_duration_minutes)}</div>
                            <div className="text-xs text-muted-foreground">Total Time</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <Flame className="h-5 w-5 mx-auto mb-1 text-primary" />
                            <div className="text-2xl font-bold">{Math.round(selectedReport.total_calories_burned)}</div>
                            <div className="text-xs text-muted-foreground">Calories</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                            <div className="text-2xl font-bold">{selectedReport.days_skipped}</div>
                            <div className="text-xs text-muted-foreground">Days Skipped</div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Weekly Averages */}
                      {selectedReport.report_data.weekly_averages && (
                        <div>
                          <h3 className="font-semibold mb-3">Weekly Averages</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-lg font-bold">
                                {selectedReport.report_data.weekly_averages.workouts_per_week}
                              </div>
                              <div className="text-xs text-muted-foreground">Workouts/Week</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-lg font-bold">
                                {formatDuration(Math.round(selectedReport.report_data.weekly_averages.duration_per_week))}
                              </div>
                              <div className="text-xs text-muted-foreground">Duration/Week</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-lg font-bold">
                                {Math.round(selectedReport.report_data.weekly_averages.calories_per_week)}
                              </div>
                              <div className="text-xs text-muted-foreground">Calories/Week</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Activity Breakdown */}
                      {selectedReport.report_data.activity_breakdown && (
                        <div>
                          <h3 className="font-semibold mb-3">Most Frequent Activities</h3>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedReport.report_data.activity_breakdown)
                              .sort(([,a], [,b]) => (b as number) - (a as number))
                              .slice(0, 6)
                              .map(([activity, count]) => (
                                <Badge key={activity} variant="outline" className="text-sm">
                                  {activity} ({count})
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Personalized Message */}
                      <div>
                        <h3 className="font-semibold mb-3">Your Progress</h3>
                        <p className="text-sm leading-relaxed mb-4">
                          {selectedReport.personalized_message}
                        </p>
                      </div>

                      {/* Smart Suggestions */}
                      <div>
                        <h3 className="font-semibold mb-3">Smart Suggestions</h3>
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                          <p className="text-sm leading-relaxed">
                            {selectedReport.smart_suggestions}
                          </p>
                        </div>
                      </div>

                      {/* Missed Areas */}
                      {selectedReport.missed_target_areas.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3">Areas to Explore</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.missed_target_areas.map((area) => (
                              <Badge key={area} variant="outline" className="text-sm">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}