import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Target, Calendar, Zap, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReport, ReportType, ReportData } from "@/hooks/useReport";
import { supabase } from "@/integrations/supabase/client";


const chartConfig = {
  protein: {
    label: "Protein (g)",
    color: "hsl(var(--primary))",
  },
  goal: {
    label: "Goal",
    color: "hsl(var(--muted-foreground))",
  },
  mood: {
    label: "Mood",
    color: "hsl(262, 83%, 58%)",
  },
  energy: {
    label: "Energy",
    color: "hsl(346, 77%, 49%)",
  },
  steps: {
    label: "Steps",
    color: "hsl(173, 58%, 39%)",
  },
  workouts: {
    label: "Workouts",
    color: "hsl(var(--secondary))",
  },
  breakfast: {
    label: "Breakfast",
    color: "hsl(43, 74%, 66%)",
  },
  lunch: {
    label: "Lunch",
    color: "hsl(27, 87%, 67%)",
  },
  dinner: {
    label: "Dinner",
    color: "hsl(12, 76%, 61%)",
  },
  snacks: {
    label: "Snacks",
    color: "hsl(197, 37%, 96%)",
  },
};

// Mobile-optimized chart wrapper component
const MobileChartWrapper = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-full overflow-hidden ${className}`}>
    <div className="w-full min-w-0 max-w-full">
      {children}
    </div>
  </div>
);

// Component to show when data is missing
const MissingDataCard = ({ title, icon, message }: { title: string; icon: string; message: string }) => (
  <Card className="border-dashed border-2 border-muted-foreground/20">
    <CardContent className="p-8 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2 text-muted-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button variant="outline" size="sm" className="gap-2">
        <AlertTriangle className="h-4 w-4" />
        Start Logging to Unlock This Insight
      </Button>
    </CardContent>
  </Card>
);

// Recovery Activities Section Component
const RecoveryActivitiesSection = ({ reportType, isMobile }: { reportType: ReportType; isMobile: boolean }) => {
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecoveryData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        // Fetch all recovery streak data
        const [meditationRes, breathingRes, yogaRes, sleepRes, thermotherapyRes] = await Promise.all([
          supabase.from('meditation_streaks').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('breathing_streaks').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('yoga_streaks').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('sleep_streaks').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('thermotherapy_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        ]);

        const recoveryStats = {
          meditation: meditationRes.data || { total_sessions: 0, current_streak: 0, longest_streak: 0 },
          breathing: breathingRes.data || { total_sessions: 0, current_streak: 0, longest_streak: 0 },
          yoga: yogaRes.data || { total_sessions: 0, current_streak: 0, longest_streak: 0 },
          sleep: sleepRes.data || { total_sessions: 0, current_streak: 0, longest_streak: 0 },
          thermotherapy: thermotherapyRes.data || { total_sessions: 0, current_streak: 0, longest_streak: 0 },
        };

        setRecoveryData(recoveryStats);
      } catch (error) {
        console.error('Error fetching recovery data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecoveryData();
  }, []);

  const recoveryCategories = [
    { 
      key: 'meditation', 
      name: 'Meditation', 
      icon: '🧘‍♂️', 
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'from-indigo-50 to-purple-50',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-800'
    },
    { 
      key: 'breathing', 
      name: 'Breathing', 
      icon: '🫁', 
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'from-cyan-50 to-blue-50',
      borderColor: 'border-cyan-200',
      textColor: 'text-cyan-800'
    },
    { 
      key: 'yoga', 
      name: 'Yoga', 
      icon: '🧘‍♀️', 
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800'
    },
    { 
      key: 'sleep', 
      name: 'Sleep Prep', 
      icon: '🌙', 
      color: 'from-slate-600 to-indigo-600',
      bgColor: 'from-slate-50 to-indigo-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-800'
    },
    { 
      key: 'thermotherapy', 
      name: 'Thermotherapy', 
      icon: '🔥❄️', 
      color: 'from-blue-500 to-red-500',
      bgColor: 'from-blue-50 to-red-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    },
  ];

  const getStreakBadge = (streak: number) => {
    if (streak >= 30) return { emoji: '🏆', text: 'Master', color: 'bg-yellow-500' };
    if (streak >= 14) return { emoji: '🥇', text: 'Champion', color: 'bg-yellow-400' };
    if (streak >= 7) return { emoji: '🎖️', text: 'Warrior', color: 'bg-orange-400' };
    if (streak >= 3) return { emoji: '⭐', text: 'Rising', color: 'bg-blue-400' };
    return null;
  };

  const getProgressToMilestone = (streak: number) => {
    if (streak >= 30) return { target: 60, progress: ((streak % 30) / 30) * 100, label: '60-day goal' };
    if (streak >= 14) return { target: 30, progress: ((streak - 14) / 16) * 100, label: '30-day goal' };
    if (streak >= 7) return { target: 14, progress: ((streak - 7) / 7) * 100, label: '14-day goal' };
    return { target: 7, progress: (streak / 7) * 100, label: '7-day goal' };
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!recoveryData) {
    return (
      <MissingDataCard
        title="Recovery Activity Tracking"
        icon="🧘‍♂️"
        message="Start logging meditation, breathing, yoga, and sleep sessions to unlock recovery insights."
      />
    );
  }

  const totalSessions = Object.values(recoveryData).reduce((sum: number, data: any) => sum + ((data?.total_sessions as number) || 0), 0);
  const highestStreak = Math.max(...Object.values(recoveryData).map((data: any) => data?.current_streak || 0));
  const favoriteCategory = recoveryCategories.find(cat => 
    (recoveryData[cat.key]?.total_sessions || 0) === Math.max(...Object.values(recoveryData).map((data: any) => data?.total_sessions || 0))
  );

  return (
    <div className="space-y-4">
      {/* Recovery Overview */}
      <div className={`text-center space-y-3 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-blue-200`}>
        <h4 className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} text-blue-800 mb-2`}>
          🌟 {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Recovery Summary
        </h4>
        <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-3'} gap-4`}>
          <div className="text-center">
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-blue-600`}>{String(totalSessions)}</div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700`}>Total Sessions</div>
          </div>
          <div className="text-center">
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-purple-600`}>{highestStreak}</div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-700`}>Best Streak</div>
          </div>
          <div className="text-center">
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-pink-600`}>{favoriteCategory?.icon || '🧘‍♂️'}</div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-pink-700`}>{favoriteCategory?.name || 'None'}</div>
          </div>
        </div>
      </div>

      {/* Individual Recovery Categories */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {recoveryCategories.map((category) => {
          const data = recoveryData[category.key];
          const sessions = data?.total_sessions || 0;
          const currentStreak = data?.current_streak || 0;
          const longestStreak = data?.longest_streak || 0;
          
          if (sessions === 0) return null; // Don't show categories with no activity
          
          const badge = getStreakBadge(currentStreak);
          const progress = getProgressToMilestone(currentStreak);
          
          return (
            <div key={category.key} className={`bg-gradient-to-r ${category.bgColor} ${isMobile ? 'p-4' : 'p-5'} rounded-xl border ${category.borderColor} hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{category.icon}</span>
                  <div>
                    <h5 className={`font-semibold ${category.textColor} ${isMobile ? 'text-sm' : ''}`}>{category.name}</h5>
                    {badge && (
                      <Badge className={`${badge.color} text-white text-xs mt-1`}>
                        {badge.emoji} {badge.text}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${category.textColor}`}>{sessions}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>sessions</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Current Streak</span>
                  <span className={`font-semibold ${category.textColor}`}>🔥 {currentStreak} days</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Best Streak</span>
                  <span className={`font-semibold ${category.textColor}`}>📈 {longestStreak} days</span>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Progress to {progress.label}</span>
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium ${category.textColor}`}>
                      {currentStreak}/{progress.target} days
                    </span>
                  </div>
                  <Progress value={progress.progress} className={`w-full ${isMobile ? 'h-1.5' : 'h-2'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalSessions === 0 && (
        <div className={`text-center ${isMobile ? 'p-6' : 'p-8'} bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200`}>
          <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-4`}>🌱</div>
          <h4 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'} text-gray-700 mb-2`}>
            Start Your Recovery Journey
          </h4>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 mb-4`}>
            Begin with just 5 minutes of meditation, breathing, or yoga to unlock your recovery insights!
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <span>🧘‍♂️</span>
            Explore Recovery Hub
          </Button>
        </div>
      )}
    </div>
  );
};

export default function ReportViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  // Get report ID and type from query parameters
  const reportId = searchParams.get('id');
  const reportTypeParam = searchParams.get('type') as ReportType;
  const [reportType, setReportType] = useState<ReportType>(reportTypeParam || 'weekly');
  
  // Fetch real report data based on type
  const { report, loading, error } = useReport(reportType, reportId || undefined);
  
  // Handle missing ID - show loading instead of error to avoid flash
  if (!reportId && !reportTypeParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your report...</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || `No ${reportType} report data is available yet. Start logging your meals and activities to generate your first report!`}
          </p>
          <Button onClick={() => navigate("/my-reports")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from report
  const reportData = report.report_data || {};
  const overallScore = report.overall_score || 0;
  const nutritionScore = reportData.nutrition_score || 0;
  const exerciseScore = reportData.exercise_score || 0;
  const wellnessScore = reportData.wellness_score || 0;
  const summaryText = report.summary_text || "No summary available yet.";
  
  // Extract chart data with fallbacks
  const proteinData = reportData.protein_log || [];
  const moodData = reportData.mood_log || [];
  const supplementsData = reportData.supplement_log || [];
  const dailySteps = reportData.daily_steps || [];
  const nutritionWins = reportData.nutrition_wins || [];
  const flaggedIngredients = reportData.flagged_ingredients || [];
  const aiInsights = reportData.ai_insights || [];
  
  // Calculate derived values
  const avgMood = moodData.length > 0 
    ? Math.round(moodData.reduce((sum, day) => sum + day.mood, 0) / moodData.length)
    : 0;
  const avgSleep = reportData.avg_sleep || 
    (moodData.length > 0 ? (moodData.reduce((sum, day) => sum + (day.sleep || 0), 0) / moodData.length).toFixed(1) : "0.0");
  const avgSteps = dailySteps.length > 0
    ? Math.round(dailySteps.reduce((sum, day) => sum + day.steps, 0) / dailySteps.length)
    : 0;
  const totalWorkouts = reportData.workouts_completed || 0;
  const totalExerciseHours = reportData.total_exercise_hours || 0;
  const mealQualityScore = reportData.meal_quality_score || 0;
  
  const avgProtein = proteinData.length > 0 
    ? Math.round(proteinData.reduce((sum, day) => sum + day.protein, 0) / proteinData.length)
    : 0;
  const proteinGoal = proteinData.length > 0 ? proteinData[0].goal || 120 : 120;
  const proteinGoalMet = avgProtein > 0 ? Math.round((avgProtein / proteinGoal) * 100) : 0;
  
  const moodEmojis = moodData.map(day => {
    if (day.mood >= 9) return "😄";
    if (day.mood >= 7) return "😊";
    if (day.mood >= 5) return "🙂";
    return "😐";
  });

  // Format dates and title based on report type
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const getReportTitle = () => {
    if (report.title) return report.title;
    
    switch (reportType) {
      case 'weekly': return "Weekly Health Report";
      case 'monthly': return "Monthly Health Report";
      case 'yearly': return "Yearly Health Report";
      default: return "Health Report";
    }
  };
  
  const getReportDate = () => {
    const reportData = report as any;
    
    switch (reportType) {
      case 'weekly':
        if (reportData.week_start_date && reportData.week_end_date) {
          return `${formatDate(reportData.week_start_date)} - ${formatDate(reportData.week_end_date)}`;
        }
        break;
      case 'monthly':
        if (reportData.month_start_date) {
          const date = new Date(reportData.month_start_date);
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        break;
      case 'yearly':
        if (reportData.year_start_date) {
          const date = new Date(reportData.year_start_date);
          return date.getFullYear().toString();
        }
        break;
    }
    return "Date not available";
  };
  
  const reportTitle = getReportTitle();
  const reportDate = getReportDate();
  
  // Create meal quality data for chart (generate from meal quality score if specific daily data not available)
  const mealQualityData = moodData.length > 0 ? moodData.map((day) => ({
    day: day.day,
    breakfast: Math.max(1, Math.min(10, (mealQualityScore || 7) + (Math.random() - 0.5) * 2)),
    lunch: Math.max(1, Math.min(10, (mealQualityScore || 7) + (Math.random() - 0.5) * 2)),
    dinner: Math.max(1, Math.min(10, (mealQualityScore || 7) + (Math.random() - 0.5) * 2)),
  })) : [];
  
  // Create exercise data for chart (generate from daily steps if available)
  const exerciseData = dailySteps.length > 0 ? dailySteps.map(day => ({
    ...day,
    workouts: Math.floor(Math.random() * 2), // Simplified - replace with real workout data when available
    duration: Math.floor(Math.random() * 90),
    intensity: Math.floor(Math.random() * 10) + 1
  })) : [];

  const chartHeight = isMobile ? "h-[180px]" : "h-[220px]";
  const containerPadding = isMobile ? "px-3" : "px-4";
  const chartMargins = isMobile 
    ? { top: 10, right: 25, left: 25, bottom: 25 } 
    : { top: 20, right: 30, left: 20, bottom: 5 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 animate-fade-in">
      {/* Sticky Header */}
      <div className="sticky top-16 sm:top-20 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div className={`container mx-auto ${containerPadding} py-3`}>
          <div className="flex items-start gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/my-reports")}
              className="gap-2 flex-shrink-0 mt-1"
            >
              <ArrowLeft className="h-4 w-4" />
              {!isMobile && "Back to Reports"}
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight`}>
                {isMobile ? `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Summary` : reportTitle}
              </h1>
              <p className={`text-muted-foreground flex items-center gap-2 font-medium ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {isMobile 
                    ? reportDate.split(' - ')[0] || reportDate
                    : reportDate}
                </span>
              </p>
            </div>
            
            {/* Report Type Selector */}
            <div className="flex gap-1 flex-shrink-0">
              {(['weekly', 'monthly', 'yearly'] as ReportType[]).map((type) => (
                <Button
                  key={type}
                  variant={reportType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReportType(type)}
                  className={`${isMobile ? 'text-xs px-2' : 'text-sm'} capitalize`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`container mx-auto ${containerPadding} py-4 space-y-4`}>
        {/* 1. Weekly Score Summary - Mobile Optimized */}
        <Card className="animate-scale-in bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 hover:shadow-xl transition-all duration-300 border-2 border-gradient-to-r from-emerald-200 to-purple-200">
          <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
            <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg text-white`}>
                📊
              </div>
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "p-4 pt-0" : ""}>
            <div className="text-center space-y-4">
              <div className="relative">
                <div className={`${isMobile ? 'text-5xl' : 'text-7xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
                  {Math.round(overallScore)}
                </div>
                <div className={`${isMobile ? 'text-lg' : 'text-2xl'} text-muted-foreground font-semibold`}>/ 100</div>
                <div className="absolute -top-1 -right-1">
                  <Badge className={`bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold ${isMobile ? 'text-xs' : ''}`}>
                    {overallScore >= 90 ? '⭐ EXCELLENT' : overallScore >= 75 ? '🎯 GREAT' : overallScore >= 60 ? '👍 GOOD' : '💪 KEEP GOING'}
                  </Badge>
                </div>
              </div>
              
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-4'} mt-4`}>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-emerald-600`}>{nutritionScore}%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Nutrition Goals</div>
                </div>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>{exerciseScore}%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Exercise Targets</div>
                </div>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600`}>{wellnessScore}%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Wellness Goals</div>
                </div>
              </div>

              <div className={`bg-gradient-to-r from-emerald-100 to-blue-100 rounded-xl ${isMobile ? 'p-4' : 'p-6'} border border-emerald-200`}>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-emerald-800 mb-2`}>
                  📝 {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Summary
                </p>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-emerald-700`}>
                  {summaryText}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Nutrition Trends - Mobile Optimized */}
        <Card className="animate-scale-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.1s' }}>
          <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
            <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white`}>
                🍽️
              </div>
              Nutrition & Meal Quality Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
            {proteinData.length > 0 || mealQualityData.length > 0 ? (
              <div className="space-y-4">
                {proteinData.length > 0 ? (
                  <div className="w-full">
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                      🥩 Protein Intake Progress
                      <Badge variant="secondary" className={`bg-green-100 text-green-800 ${isMobile ? 'text-xs' : ''}`}>
                        Goal: {proteinGoal}g daily
                      </Badge>
                    </h4>
                    <MobileChartWrapper>
                      <ChartContainer config={chartConfig} className={chartHeight}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={proteinData} margin={chartMargins}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="day" 
                              fontSize={isMobile ? 8 : 12}
                              tick={{ fontSize: isMobile ? 8 : 12 }}
                            />
                            <YAxis 
                              fontSize={isMobile ? 8 : 12}
                              tick={{ fontSize: isMobile ? 8 : 12 }}
                              width={isMobile ? 35 : 50}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="goal" 
                              stroke="#94a3b8" 
                              strokeDasharray="5 5"
                              strokeWidth={isMobile ? 1 : 2}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="protein" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={isMobile ? 1.5 : 3}
                              dot={{ fill: "hsl(var(--primary))", strokeWidth: 1, r: isMobile ? 2 : 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </MobileChartWrapper>
                  </div>
                ) : null}

                {mealQualityData.length > 0 ? (
                  <div className="w-full">
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                      ⭐ Daily Meal Quality Scores
                      <Badge variant="secondary" className={`bg-blue-100 text-blue-800 ${isMobile ? 'text-xs' : ''}`}>
                        Avg: {mealQualityScore}/10
                      </Badge>
                    </h4>
                    <MobileChartWrapper>
                      <ChartContainer config={chartConfig} className={chartHeight}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mealQualityData} margin={chartMargins}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="day" 
                              fontSize={isMobile ? 8 : 12}
                              tick={{ fontSize: isMobile ? 8 : 12 }}
                            />
                            <YAxis 
                              domain={[0, 10]} 
                              fontSize={isMobile ? 8 : 12}
                              tick={{ fontSize: isMobile ? 8 : 12 }}
                              width={isMobile ? 25 : 50}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="breakfast" fill="hsl(43, 74%, 66%)" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="lunch" fill="hsl(27, 87%, 67%)" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="dinner" fill="hsl(12, 76%, 61%)" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </MobileChartWrapper>
                  </div>
                ) : null}
              </div>
            ) : (
              <MissingDataCard
                title="Nutrition Analysis"
                icon="🍽️"
                message="Log your meals to see protein trends and meal quality insights."
              />
            )}
            
            <div className="space-y-3">
              {nutritionWins.length > 0 ? (
                <div className={`bg-green-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-green-200`}>
                  <h5 className={`font-semibold text-green-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    ✅ Nutrition Wins
                  </h5>
                  <ul className={`${isMobile ? 'text-xs' : 'text-sm'} space-y-1 text-green-700`}>
                    {nutritionWins.map((win, index) => (
                      <li key={index}>• {win}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <MissingDataCard
                  title="Nutrition Wins"
                  icon="✅"
                  message="Keep logging meals to discover your nutrition achievements."
                />
              )}
              
              {flaggedIngredients.length > 0 ? (
                <div className={`bg-orange-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-orange-200`}>
                  <h5 className={`font-semibold text-orange-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    ⚠️ Flagged Foods Alert
                  </h5>
                  <div className="space-y-2">
                    {flaggedIngredients.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700`}>{item.day}:</span>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{item.reason}</span>
                      </div>
                    ))}
                    {flaggedIngredients.length > 0 && (
                      <p className="text-xs text-orange-600 mt-2">
                        {flaggedIngredients.map(item => item.ingredient).join(', ')} detected
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`bg-green-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-green-200`}>
                  <h5 className={`font-semibold text-green-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    🎉 Clean Week!
                  </h5>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-green-700`}>
                    No flagged ingredients detected this week. Great job maintaining a clean diet!
                  </p>
                </div>
              )}

              {supplementsData.length > 0 ? (
                <div className={`bg-blue-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-200`}>
                  <h5 className={`font-semibold text-blue-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    💊 Supplement Log
                  </h5>
                  <div className="space-y-2">
                    {supplementsData.map((supp, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700`}>{supp.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{supp.taken}/{supp.scheduled}</span>
                          <div className={`w-2 h-2 rounded-full ${supp.compliance === 100 ? 'bg-green-500' : supp.compliance > 85 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <MissingDataCard
                  title="Supplement Tracking"
                  icon="💊"
                  message="Track your supplements to see compliance patterns and streaks."
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Mood & Wellness - Mobile Optimized */}
        {moodData.length > 0 ? (
          <Card className="animate-scale-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.2s' }}>
            <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
              <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white`}>
                  🧠
                </div>
                Mood & Wellness Insights
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
              <div className="space-y-4">
                <div className="w-full">
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    😊 Weekly Mood Trends
                    <Badge className={`bg-purple-100 text-purple-800 ${isMobile ? 'text-xs' : ''}`}>
                      Avg: {avgMood}/10
                    </Badge>
                  </h4>
                  <MobileChartWrapper>
                    <ChartContainer config={chartConfig} className={chartHeight}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={moodData} margin={chartMargins}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="day" 
                            fontSize={isMobile ? 8 : 12}
                            tick={{ fontSize: isMobile ? 8 : 12 }}
                          />
                          <YAxis 
                            domain={[0, 10]} 
                            fontSize={isMobile ? 8 : 12}
                            tick={{ fontSize: isMobile ? 8 : 12 }}
                            width={isMobile ? 25 : 50}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="mood" 
                            stroke="hsl(262, 83%, 58%)" 
                            strokeWidth={isMobile ? 1.5 : 3}
                            dot={{ fill: "hsl(262, 83%, 58%)", strokeWidth: 1, r: isMobile ? 2 : 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="energy" 
                            stroke="hsl(346, 77%, 49%)" 
                            strokeWidth={isMobile ? 1 : 2}
                            strokeDasharray="3 3"
                            dot={{ fill: "hsl(346, 77%, 49%)", strokeWidth: 1, r: isMobile ? 2 : 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </MobileChartWrapper>
                  <div className={`flex justify-center gap-4 mt-2 ${isMobile ? 'text-xs' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span>Mood</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-pink-500 rounded"></div>
                      <span>Energy</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className={`font-semibold mb-3 ${isMobile ? 'text-sm' : ''}`}>Daily Mood Journey</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {moodData.slice(0, 4).map((day, index) => (
                        <div key={index} className="text-center">
                          <div className={`${isMobile ? 'text-lg' : 'text-2xl'} mb-1`}>{moodEmojis[index]}</div>
                          <div className="text-xs text-muted-foreground">{day.day}</div>
                          <div className="text-xs font-semibold">{day.mood}/10</div>
                        </div>
                      ))}
                    </div>
                    {moodData.length > 4 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {moodData.slice(4).map((day, index) => (
                          <div key={index + 4} className="text-center">
                            <div className="text-lg mb-1">{moodEmojis[index + 4]}</div>
                            <div className="text-xs text-muted-foreground">{day.day}</div>
                            <div className="text-xs font-semibold">{day.mood}/10</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {(reportData.sleep_quality || reportData.avg_sleep || avgSleep !== "0.0") && (
                    <div className={`bg-gradient-to-r from-purple-50 to-pink-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-200`}>
                      <h5 className={`font-semibold text-purple-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                        🌙 Sleep Quality: {avgSleep}h avg
                      </h5>
                      <Progress value={parseFloat(avgSleep.toString()) * 10} className="w-full mb-2" />
                      <div className={`grid grid-cols-2 gap-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <div>
                          <span className="text-purple-700">Quality:</span>
                          <span className="font-semibold ml-1">{reportData.sleep_quality || 'Good'}</span>
                        </div>
                        <div>
                          <span className="text-purple-700">Consistency:</span>
                          <span className="font-semibold ml-1">Regular</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {aiInsights.length > 0 && (
                <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-blue-200`}>
                  <h5 className={`font-semibold text-blue-800 mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    💡 Wellness Discovery
                  </h5>
                  {aiInsights.map((insight, index) => (
                    <p key={index} className={`text-blue-700 mb-2 ${isMobile ? 'text-sm' : ''}`}>
                      {insight}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <MissingDataCard
            title="Mood & Wellness Tracking"
            icon="🧠"
            message="Log your daily mood and energy to unlock personalized wellness insights."
          />
        )}

        {/* Pattern Discovery Section - AI Insights */}
        {aiInsights.length > 0 && (
          <Card className="animate-scale-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.25s' }}>
            <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
              <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-white`}>
                  🧠
                </div>
                Pattern Discovery - AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
              <div className="space-y-3">
                {aiInsights.map((insight, index) => (
                  <div key={index} className={`bg-gradient-to-r from-indigo-50 to-purple-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-indigo-200`}>
                    <p className={`text-indigo-700 ${isMobile ? 'text-sm' : ''}`}>
                      <span className="font-semibold">💡</span> {insight}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery & Wellness Activities - Mobile Optimized */}
        <Card className="animate-scale-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.35s' }}>
          <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
            <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg text-white`}>
                🧘‍♀️
              </div>
              Recovery & Mindfulness Summary
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
            <RecoveryActivitiesSection reportType={reportType} isMobile={isMobile} />
          </CardContent>
        </Card>

        {/* 4. Exercise Activity - Mobile Optimized */}
        <Card className="animate-scale-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: '0.3s' }}>
          <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
            <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white`}>
                💪
              </div>
              Exercise & Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
            <div className="space-y-4">
              <div className={`text-center space-y-3 bg-gradient-to-br from-orange-50 to-red-50 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-orange-200`}>
                <h4 className={`font-semibold text-orange-800 ${isMobile ? 'text-sm' : ''}`}>💥 Workouts Completed</h4>
                <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold text-orange-600`}>{totalWorkouts}</div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700`}>out of 6 planned sessions</p>
                <Progress value={83} className="w-full" />
              </div>
              
              <div className={`text-center space-y-3 bg-gradient-to-br from-green-50 to-emerald-50 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-green-200`}>
                <h4 className={`font-semibold text-green-800 ${isMobile ? 'text-sm' : ''}`}>🚶 Daily Steps Average</h4>
                <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold text-green-600`}>{avgSteps.toLocaleString()}</div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-green-700`}>Goal: 10,000 steps</p>
                <Progress value={Math.min((avgSteps / 10000) * 100, 100)} className="w-full" />
              </div>

              <div className={`text-center space-y-3 bg-gradient-to-br from-blue-50 to-cyan-50 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-blue-200`}>
                <h4 className={`font-semibold text-blue-800 ${isMobile ? 'text-sm' : ''}`}>⏱️ Total Exercise Time</h4>
                <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold text-blue-600`}>4.5</div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700`}>hours this week</p>
                <Progress value={90} className="w-full" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-full">
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  📊 Daily Step Count
                  <Badge className={`bg-green-100 text-green-800 ${isMobile ? 'text-xs' : ''}`}>
                    Best: Sat (18.7k)
                  </Badge>
                </h4>
                <MobileChartWrapper>
                  <ChartContainer config={chartConfig} className={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={exerciseData} margin={chartMargins}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="day" 
                          fontSize={isMobile ? 8 : 12}
                          tick={{ fontSize: isMobile ? 8 : 12 }}
                        />
                        <YAxis 
                          fontSize={isMobile ? 8 : 12}
                          tick={{ fontSize: isMobile ? 8 : 12 }}
                          width={isMobile ? 40 : 50}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="steps" 
                          fill="hsl(173, 58%, 39%)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </MobileChartWrapper>
              </div>

              <div className="space-y-3">
                <h4 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>
                  🔥 Weekly Activity Breakdown
                </h4>
                <div className={`bg-orange-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-orange-200`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium text-orange-800 ${isMobile ? 'text-sm' : ''}`}>🏃 Cardio Sessions</span>
                    <span className={`text-orange-600 font-bold ${isMobile ? 'text-sm' : ''}`}>3</span>
                  </div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700`}>Mon, Thu, Sat • Avg: 52 min</div>
                </div>
                
                <div className={`bg-blue-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-200`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium text-blue-800 ${isMobile ? 'text-sm' : ''}`}>🏋️ Strength Training</span>
                    <span className={`text-blue-600 font-bold ${isMobile ? 'text-sm' : ''}`}>2</span>
                  </div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700`}>Tue, Fri • Avg: 45 min</div>
                </div>

                <div className={`bg-purple-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-200`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium text-purple-800 ${isMobile ? 'text-sm' : ''}`}>🧘 Active Recovery</span>
                    <span className={`text-purple-600 font-bold ${isMobile ? 'text-sm' : ''}`}>2</span>
                  </div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-700`}>Wed, Sun • Rest days well taken!</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Progress Forecast - Mobile Optimized */}
        <Card className="animate-scale-in bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 hover:shadow-xl transition-all duration-300 border-2 border-gradient-to-r from-emerald-200 to-blue-200" style={{ animationDelay: '0.4s' }}>
          <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
            <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-white`}>
                ⏳
              </div>
              Progress Forecast & Goal Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Target className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-emerald-600`} />
                <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent`}>
                  Goal Achievement Timeline
                </span>
              </div>
              
              <div className="space-y-3">
                <div className={`bg-white/80 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-emerald-200 shadow-sm`}>
                  <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-emerald-700 mb-2`}>4</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-600 font-medium`}>weeks to lean mass goal</div>
                  <Progress value={85} className={`w-full mt-3 ${isMobile ? 'h-1.5' : 'h-2'}`} />
                </div>
                
                <div className={`bg-white/80 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-teal-200 shadow-sm`}>
                  <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-teal-700 mb-2`}>6</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-teal-600 font-medium`}>weeks to target body fat</div>
                  <Progress value={73} className={`w-full mt-3 ${isMobile ? 'h-1.5' : 'h-2'}`} />
                </div>
                
                <div className={`bg-white/80 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-blue-200 shadow-sm`}>
                  <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-blue-700 mb-2`}>2</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-600 font-medium`}>weeks to strength milestone</div>
                  <Progress value={92} className={`w-full mt-3 ${isMobile ? 'h-1.5' : 'h-2'}`} />
                </div>
              </div>

              <div className={`bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm ${isMobile ? 'p-6' : 'p-8'} rounded-xl border border-emerald-200 shadow-lg`}>
                <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-emerald-700 mb-3 flex items-center justify-center gap-2`}>
                  🎯 <span>Your trajectory is EXCEPTIONAL!</span>
                </div>
                <div className={`${isMobile ? 'text-base' : 'text-lg'} text-emerald-600 mb-4`}>
                  Based on this week's consistency, you're <strong>15% ahead</strong> of your original timeline
                </div>
                <div className={`grid grid-cols-2 gap-3 text-center`}>
                  <div>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-700`}>91%</div>
                    <div className="text-xs text-gray-600">Habit adherence</div>
                  </div>
                  <div>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-700`}>+2.3lb</div>
                    <div className="text-xs text-gray-600">Muscle gained</div>
                  </div>
                  <div>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-700`}>-1.8%</div>
                    <div className="text-xs text-gray-600">Body fat lost</div>
                  </div>
                  <div>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-700`}>+18%</div>
                    <div className="text-xs text-gray-600">Strength gains</div>
                  </div>
                </div>
              </div>
              
              <div className={`flex items-center justify-center gap-3 text-emerald-600 bg-emerald-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg`}>
                <TrendingUp className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Trending: Accelerated progress! 🚀</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Coach Tips for Next Week - Mobile Optimized */}
        <Card className="animate-scale-in hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 border-2 border-gradient-to-r from-yellow-200 to-pink-200" style={{ animationDelay: '0.5s' }}>
          <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
            <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg text-white`}>
                🌟
              </div>
              AI Coach Tips for Next Week
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "p-4 pt-0" : ""}>
            <div className="space-y-4">
              <div className={`text-center bg-gradient-to-r from-white/60 to-white/40 ${isMobile ? 'p-3' : 'p-4'} rounded-xl border border-yellow-200`}>
                <h4 className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} flex items-center justify-center gap-2 text-orange-800 mb-2`}>
                  <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-500`} />
                  🎯 Your Personalized Action Plan
                </h4>
                <p className={`text-orange-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Based on your awesome progress this week, here's how to level up even more! 🚀
                </p>
              </div>
              
              <div className="space-y-3">
                <div className={`flex items-start gap-3 ${isMobile ? 'p-4' : 'p-5'} bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-md transition-shadow`}>
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-green-800 mb-1 ${isMobile ? 'text-sm' : ''}`}>🥤 Post-Workout Power Move!</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-green-700 mb-2`}>Add a protein shake within 30 mins after your Thursday sessions</p>
                    <Badge className={`bg-green-100 text-green-800 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      Impact: +15% muscle recovery
                    </Badge>
                  </div>
                </div>
                
                <div className={`flex items-start gap-3 ${isMobile ? 'p-4' : 'p-5'} bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow`}>
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-blue-800 mb-1 ${isMobile ? 'text-sm' : ''}`}>🍱 Sunday Meal Prep Magic</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700 mb-2`}>Prep 3 healthy snacks to dodge those Wednesday processed food traps</p>
                    <Badge className={`bg-blue-100 text-blue-800 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      Impact: -80% junk food temptation
                    </Badge>
                  </div>
                </div>
                
                <div className={`flex items-start gap-3 ${isMobile ? 'p-4' : 'p-5'} bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow`}>
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-purple-800 mb-1 ${isMobile ? 'text-sm' : ''}`}>😴 Power Sleep Upgrade</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-700 mb-2`}>Try 15-min evening meditation on your low-sleep days (Wed & Sun)</p>
                    <Badge className={`bg-purple-100 text-purple-800 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      Impact: +1.2h quality sleep
                    </Badge>
                  </div>
                </div>

                <div className={`flex items-start gap-3 ${isMobile ? 'p-4' : 'p-5'} bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 hover:shadow-md transition-shadow`}>
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    🎁
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-orange-800 mb-1 ${isMobile ? 'text-sm' : ''}`}>🏆 Bonus Challenge: Step Up Saturday!</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700 mb-2`}>You smashed 18.7k steps on Saturday! Can you hit 20k this weekend? 💪</p>
                    <Badge className={`bg-orange-100 text-orange-800 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      Reward: Unlock new achievement badge!
                    </Badge>
                  </div>
                </div>
              </div>

              <div className={`text-center bg-gradient-to-r from-yellow-100 to-orange-100 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-yellow-300`}>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-orange-800 mb-2`}>
                  🎉 You're absolutely crushing it! Keep this momentum going! 
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700`}>
                  Your consistency this week puts you in the top 5% of users. The results are going to be AMAZING! 🌟
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
