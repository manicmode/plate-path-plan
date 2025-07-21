
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Target, Calendar, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";

// Rich mock data for the report
const proteinData = [
  { day: "Mon", protein: 105, goal: 120, calories: 2180 },
  { day: "Tue", protein: 118, goal: 120, calories: 2050 },
  { day: "Wed", protein: 95, goal: 120, calories: 1950 },
  { day: "Thu", protein: 125, goal: 120, calories: 2200 },
  { day: "Fri", protein: 110, goal: 120, calories: 2100 },
  { day: "Sat", protein: 115, goal: 120, calories: 2300 },
  { day: "Sun", protein: 122, goal: 120, calories: 2150 }
];

const moodData = [
  { day: "Mon", mood: 8, energy: 7, stress: 3, sleep: 7.5 },
  { day: "Tue", mood: 9, energy: 8, stress: 2, sleep: 8.2 },
  { day: "Wed", mood: 6, energy: 5, stress: 6, sleep: 6.8 },
  { day: "Thu", mood: 9, energy: 9, stress: 1, sleep: 8.5 },
  { day: "Fri", mood: 8, energy: 8, stress: 3, sleep: 7.9 },
  { day: "Sat", mood: 10, energy: 9, stress: 1, sleep: 8.8 },
  { day: "Sun", mood: 7, energy: 6, stress: 4, sleep: 7.2 }
];

const exerciseData = [
  { day: "Mon", steps: 8500, workouts: 1, duration: 45, intensity: 7 },
  { day: "Tue", steps: 12200, workouts: 1, duration: 60, intensity: 8 },
  { day: "Wed", steps: 6800, workouts: 0, duration: 0, intensity: 3 },
  { day: "Thu", steps: 15300, workouts: 2, duration: 90, intensity: 9 },
  { day: "Fri", steps: 9500, workouts: 1, duration: 30, intensity: 6 },
  { day: "Sat", steps: 18700, workouts: 1, duration: 75, intensity: 8 },
  { day: "Sun", steps: 7200, workouts: 0, duration: 0, intensity: 4 }
];

const mealQualityData = [
  { day: "Mon", breakfast: 9, lunch: 8, dinner: 7, snacks: 6 },
  { day: "Tue", breakfast: 8, lunch: 9, dinner: 9, snacks: 8 },
  { day: "Wed", breakfast: 6, lunch: 5, dinner: 6, snacks: 4 },
  { day: "Thu", breakfast: 9, lunch: 8, dinner: 9, snacks: 9 },
  { day: "Fri", breakfast: 7, lunch: 8, dinner: 8, snacks: 7 },
  { day: "Sat", breakfast: 8, lunch: 6, dinner: 7, snacks: 5 },
  { day: "Sun", breakfast: 9, lunch: 9, dinner: 8, snacks: 8 }
];

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

export default function ReportViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Get report data from navigation state or use defaults
  const reportData = location.state || {};
  const reportTitle = reportData.title || "Weekly Nutrition Summary";
  const reportDate = reportData.date || "August – Week 2 (08/12/2025 - 08/18/2025)";
  const reportType = reportData.tabType || "weekly";

  // Calculate averages from mock data
  const avgMood = Math.round(moodData.reduce((sum, day) => sum + day.mood, 0) / moodData.length);
  const avgSleep = (moodData.reduce((sum, day) => sum + day.sleep, 0) / moodData.length).toFixed(1);
  const avgSteps = Math.round(exerciseData.reduce((sum, day) => sum + day.steps, 0) / exerciseData.length);
  const totalWorkouts = exerciseData.reduce((sum, day) => sum + day.workouts, 0);
  const avgProtein = Math.round(proteinData.reduce((sum, day) => sum + day.protein, 0) / proteinData.length);
  const proteinGoalMet = Math.round((avgProtein / 120) * 100);
  
  const moodEmojis = moodData.map(day => {
    if (day.mood >= 9) return "😄";
    if (day.mood >= 7) return "😊";
    if (day.mood >= 5) return "🙂";
    return "😐";
  });
  
  const supplements = [
    { name: "Vitamin D3", taken: 7, scheduled: 7, compliance: 100 },
    { name: "Omega-3", taken: 6, scheduled: 7, compliance: 86 },
    { name: "Magnesium", taken: 7, scheduled: 7, compliance: 100 },
    { name: "B-Complex", taken: 5, scheduled: 7, compliance: 71 }
  ];

  const chartHeight = isMobile ? "h-[180px]" : "h-[220px]";
  const containerPadding = isMobile ? "px-3" : "px-4";
  const chartMargins = isMobile 
    ? { top: 10, right: 25, left: 25, bottom: 25 } 
    : { top: 20, right: 30, left: 20, bottom: 5 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 animate-fade-in">
      {/* Sticky Header */}
      <div className="sticky top-14 sm:top-16 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm">
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
                {isMobile ? "Weekly Summary" : reportTitle}
              </h1>
              <p className={`text-muted-foreground flex items-center gap-2 font-medium ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {isMobile ? "Aug 12-18, 2025" : reportDate}
                </span>
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 flex-shrink-0">
              Complete
            </Badge>
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
              Weekly Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "p-4 pt-0" : ""}>
            <div className="text-center space-y-4">
              <div className="relative">
                <div className={`${isMobile ? 'text-5xl' : 'text-7xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
                  91
                </div>
                <div className={`${isMobile ? 'text-lg' : 'text-2xl'} text-muted-foreground font-semibold`}>/ 100</div>
                <div className="absolute -top-1 -right-1">
                  <Badge className={`bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold ${isMobile ? 'text-xs' : ''}`}>
                    ⭐ EXCELLENT
                  </Badge>
                </div>
              </div>
              
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-4'} mt-4`}>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-emerald-600`}>{proteinGoalMet}%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Nutrition Goals</div>
                </div>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>92%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Exercise Targets</div>
                </div>
                <div className="text-center">
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600`}>88%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Wellness Goals</div>
                </div>
              </div>

              <div className={`bg-gradient-to-r from-emerald-100 to-blue-100 rounded-xl ${isMobile ? 'p-4' : 'p-6'} border border-emerald-200`}>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-emerald-800 mb-2`}>
                  🎉 Outstanding performance this week!
                </p>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-emerald-700`}>
                  You've exceeded your protein goals, maintained consistent workouts, and your mood trends are fantastic. Keep up the amazing work! 🚀
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
            <div className="space-y-4">
              <div className="w-full">
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  🥩 Protein Intake Progress
                  <Badge variant="secondary" className={`bg-green-100 text-green-800 ${isMobile ? 'text-xs' : ''}`}>
                    Goal: 120g daily
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

              <div className="w-full">
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  ⭐ Daily Meal Quality Scores
                  <Badge variant="secondary" className={`bg-blue-100 text-blue-800 ${isMobile ? 'text-xs' : ''}`}>
                    Avg: 7.8/10
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
            </div>
            
            <div className="space-y-3">
              <div className={`bg-green-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-green-200`}>
                <h5 className={`font-semibold text-green-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  ✅ Nutrition Wins
                </h5>
                <ul className={`${isMobile ? 'text-xs' : 'text-sm'} space-y-1 text-green-700`}>
                  <li>• Met protein goals 6/7 days</li>
                  <li>• Exceeded fiber by 22%</li>
                  <li>• Perfect vitamin D compliance</li>
                  <li>• 89% whole food meals</li>
                </ul>
              </div>
              
              <div className={`bg-orange-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-orange-200`}>
                <h5 className={`font-semibold text-orange-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  ⚠️ Flagged Foods Alert
                </h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700`}>Wednesday:</span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">High Sodium</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700`}>Saturday:</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Processed</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    Ramen noodles (Wed) and granola bars (Sat) detected
                  </p>
                </div>
              </div>

              <div className={`bg-blue-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-blue-200`}>
                <h5 className={`font-semibold text-blue-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  💊 Supplement Log
                </h5>
                <div className="space-y-2">
                  {supplements.map((supp, index) => (
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
            </div>
          </CardContent>
        </Card>

        {/* 3. Mood & Wellness - Mobile Optimized */}
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
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {moodData.slice(4).map((day, index) => (
                      <div key={index + 4} className="text-center">
                        <div className="text-lg mb-1">{moodEmojis[index + 4]}</div>
                        <div className="text-xs text-muted-foreground">{day.day}</div>
                        <div className="text-xs font-semibold">{day.mood}/10</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`bg-gradient-to-r from-purple-50 to-pink-50 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-purple-200`}>
                  <h5 className={`font-semibold text-purple-800 mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                    🌙 Sleep Quality: {avgSleep}h avg
                  </h5>
                  <Progress value={78} className="w-full mb-2" />
                  <div className={`grid grid-cols-2 gap-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <div>
                      <span className="text-purple-700">Best night:</span>
                      <span className="font-semibold ml-1">Sat (8.8h)</span>
                    </div>
                    <div>
                      <span className="text-purple-700">Lowest stress:</span>
                      <span className="font-semibold ml-1">Thu & Sat</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-blue-200`}>
              <h5 className={`font-semibold text-blue-800 mb-3 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                💡 Wellness Discovery
              </h5>
              <p className={`text-blue-700 mb-2 ${isMobile ? 'text-sm' : ''}`}>
                🎯 <strong>Pattern Alert:</strong> Your mood peaks after workout days! Thursday and Saturday show the highest mood scores.
              </p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-600`}>
                💪 Your energy levels are 85% higher on days you exercise. Consider scheduling workouts on your typically low-energy days.
              </p>
            </div>
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
