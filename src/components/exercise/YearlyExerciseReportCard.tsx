import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  Calendar, 
  Trophy, 
  Clock, 
  Flame, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Star,
  Award,
  Activity,
  Share2,
  RefreshCw,
  Download,
  BarChart3,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface YearlyExerciseReport {
  id: string;
  year_start: string;
  year_end: string;
  total_workouts_completed: number;
  total_duration_minutes: number;
  total_calories_burned: number;
  days_active: number;
  days_skipped: number;
  most_frequent_muscle_groups: string[];
  missed_muscle_groups: string[];
  year_over_year_progress: {
    workouts_change?: number;
    workouts_change_percent?: number;
    duration_change?: number;
    calories_change?: number;
    activity_days_change?: number;
  };
  motivational_title: string;
  personalized_message: string;
  smart_suggestions: string;
  report_data: {
    monthly_breakdown?: Record<string, any>;
    quarterly_trends?: any[];
    activity_distribution?: Record<string, number>;
    peak_months?: string[];
    consistency_score?: number;
    fitness_milestones?: string[];
    year_over_year?: any;
  };
  created_at: string;
}

export function YearlyExerciseReportCard() {
  const [selectedReport, setSelectedReport] = useState<YearlyExerciseReport | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["yearly-exercise-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yearly_exercise_reports")
        .select("*")
        .order("year_start", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as YearlyExerciseReport[];
    },
  });

  const regenerateReportMutation = useMutation({
    mutationFn: async (year: number) => {
      const { data, error } = await supabase.functions.invoke('generate-yearly-exercise-reports', {
        body: { manual_trigger: true, target_year: year }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yearly-exercise-reports"] });
      toast({
        title: "Report Regenerated!",
        description: "Your yearly exercise report has been updated with the latest data.",
      });
      setIsRegenerating(false);
    },
    onError: (error) => {
      console.error('Error regenerating report:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate the report. Please try again.",
        variant: "destructive",
      });
      setIsRegenerating(false);
    },
  });

  const latestReport = reports?.[0];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h` : `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getYearlyMotivationColor = (workouts: number) => {
    if (workouts >= 200) return "bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600";
    if (workouts >= 100) return "bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600";
    if (workouts >= 50) return "bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600";
    return "bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600";
  };

  const getCurrentYear = () => new Date().getFullYear();

  const handleRegenerate = () => {
    if (!latestReport) return;
    setIsRegenerating(true);
    const year = new Date(latestReport.year_start).getFullYear();
    regenerateReportMutation.mutate(year);
  };

  const handleShare = async () => {
    if (!latestReport) return;
    
    const year = new Date(latestReport.year_start).getFullYear();
    const shareText = `🏆 My ${year} Fitness Journey:\n\n💪 ${latestReport.total_workouts_completed} workouts completed\n🔥 ${formatNumber(Math.round(latestReport.total_calories_burned))} calories burned\n⏱️ ${formatDuration(latestReport.total_duration_minutes)} of training\n📅 Active ${latestReport.days_active} days\n\n${latestReport.motivational_title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${year} Fitness Report`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled sharing or sharing failed
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Your fitness stats have been copied to the clipboard.",
        });
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard!",
        description: "Your fitness stats have been copied to the clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestReport) {
    return (
      <Card className="border-dashed dark:!border-2 dark:!border-teal-500/60 dark:bg-gradient-to-r dark:from-teal-500/30 dark:to-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Yearly Exercise Report
          </CardTitle>
          <CardDescription>
            Your comprehensive yearly fitness summary will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Complete workouts throughout the year to unlock your personalized annual fitness report with insights, trends, and achievements!
          </p>
          <Button 
            variant="outline" 
            onClick={() => regenerateReportMutation.mutate(getCurrentYear())}
            disabled={isRegenerating}
            className="w-full"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate {getCurrentYear()} Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const year = new Date(latestReport.year_start).getFullYear();
  const yearOverYear = latestReport.year_over_year_progress;

  return (
    <>
      <Card className="relative overflow-hidden border-2 dark:!border-2 dark:!border-teal-500/60 dark:bg-gradient-to-r dark:from-teal-500/30 dark:to-cyan-500/30">
        <div className={`absolute inset-0 opacity-15 ${getYearlyMotivationColor(latestReport.total_workouts_completed)}`} />
        
        <CardHeader className="relative pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-lg">
                  {latestReport.motivational_title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {year} Complete Fitness Journey
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-bold">
              {year}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{latestReport.total_workouts_completed}</div>
              <div className="text-xs text-muted-foreground">Workouts</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{formatDuration(latestReport.total_duration_minutes)}</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Flame className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{formatNumber(Math.round(latestReport.total_calories_burned))}</div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{latestReport.days_active}</div>
              <div className="text-xs text-muted-foreground">Active Days</div>
            </div>
          </div>

          {/* Year-over-Year Progress */}
          {yearOverYear?.workouts_change !== undefined && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Year-over-Year Progress
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                {yearOverYear.workouts_change > 0 ? '+' : ''}{yearOverYear.workouts_change} workouts 
                ({yearOverYear.workouts_change_percent > 0 ? '+' : ''}{yearOverYear.workouts_change_percent}%) 
                compared to last year
              </p>
            </div>
          )}

          {/* Quick Summary */}
          <p className="text-sm leading-relaxed text-center">
            {latestReport.personalized_message}
          </p>

          {/* Top Activities */}
          <div className="flex flex-wrap gap-2 justify-center">
            {latestReport.most_frequent_muscle_groups.slice(0, 4).map((activity) => (
              <Badge key={activity} variant="outline" className="text-xs">
                {activity}
              </Badge>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" className="w-full" onClick={() => setSelectedReport(latestReport)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Full Report
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                {selectedReport && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl flex items-center gap-2">
                        <Award className="h-6 w-6 text-primary" />
                        {selectedReport.motivational_title}
                      </DialogTitle>
                      <DialogDescription className="text-base">
                        Complete fitness analysis for {new Date(selectedReport.year_start).getFullYear()}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8">
                      {/* Hero Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-3xl font-bold">{selectedReport.total_workouts_completed}</div>
                          <div className="text-sm text-muted-foreground">Total Workouts</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-3xl font-bold">{Math.round(selectedReport.total_duration_minutes / 60)}</div>
                          <div className="text-sm text-muted-foreground">Hours Trained</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Flame className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-3xl font-bold">{formatNumber(Math.round(selectedReport.total_calories_burned))}</div>
                          <div className="text-sm text-muted-foreground">Calories Burned</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                          <div className="text-3xl font-bold">{selectedReport.days_active}</div>
                          <div className="text-sm text-muted-foreground">Active Days</div>
                        </div>
                      </div>

                      <Separator />

                      {/* Consistency Score */}
                      {selectedReport.report_data.consistency_score !== undefined && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Consistency Score
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Your workout consistency throughout {new Date(selectedReport.year_start).getFullYear()}</span>
                              <span className="font-bold">{Math.round(selectedReport.report_data.consistency_score)}%</span>
                            </div>
                            <Progress value={selectedReport.report_data.consistency_score} className="h-2" />
                          </div>
                        </div>
                      )}

                      {/* Fitness Milestones */}
                      {selectedReport.report_data.fitness_milestones && selectedReport.report_data.fitness_milestones.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Fitness Milestones Achieved
                          </h3>
                          <div className="grid gap-3">
                            {selectedReport.report_data.fitness_milestones.map((milestone, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 rounded-lg">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                <span className="text-sm font-medium">{milestone}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Quarterly Trends */}
                      {selectedReport.report_data.quarterly_trends && (
                        <div>
                          <h3 className="font-semibold mb-3">Quarterly Performance</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedReport.report_data.quarterly_trends.map((quarter, index) => (
                              <div key={index} className="text-center p-3 bg-muted rounded-lg">
                                <div className="text-lg font-bold">{quarter.workouts}</div>
                                <div className="text-sm text-muted-foreground">{quarter.quarter_name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {Math.round(quarter.avg_workouts_per_month * 10) / 10}/month avg
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Peak Months */}
                      {selectedReport.report_data.peak_months && selectedReport.report_data.peak_months.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3">Peak Performance Months</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.report_data.peak_months.map((month) => (
                              <Badge key={month} variant="secondary" className="text-sm">
                                🏆 {month}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Most Frequent Activities */}
                      <div>
                        <h3 className="font-semibold mb-3">Top Activities</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedReport.most_frequent_muscle_groups.map((activity) => (
                            <Badge key={activity} variant="outline" className="text-sm">
                              {activity}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Areas to Explore */}
                      {selectedReport.missed_muscle_groups.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3">Areas to Explore</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.missed_muscle_groups.map((area) => (
                              <Badge key={area} variant="outline" className="text-sm opacity-60">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Personalized Message */}
                      <div>
                        <h3 className="font-semibold mb-3">Your {new Date(selectedReport.year_start).getFullYear()} Journey</h3>
                        <p className="text-sm leading-relaxed mb-4">
                          {selectedReport.personalized_message}
                        </p>
                      </div>

                      {/* Smart Suggestions */}
                      <div>
                        <h3 className="font-semibold mb-3">Looking Ahead</h3>
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                          <p className="text-sm leading-relaxed">
                            {selectedReport.smart_suggestions}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}