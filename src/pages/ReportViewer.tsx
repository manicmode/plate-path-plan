import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Target, Calendar, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Mock data for the report
const proteinData = [
  { day: "Mon", protein: 85, goal: 100 },
  { day: "Tue", protein: 92, goal: 100 },
  { day: "Wed", protein: 78, goal: 100 },
  { day: "Thu", protein: 105, goal: 100 },
  { day: "Fri", protein: 88, goal: 100 },
  { day: "Sat", protein: 95, goal: 100 },
  { day: "Sun", protein: 102, goal: 100 }
];

const exerciseData = [
  { day: "Mon", intensity: 7 },
  { day: "Tue", intensity: 4 },
  { day: "Wed", intensity: 8 },
  { day: "Thu", intensity: 0 },
  { day: "Fri", intensity: 6 },
  { day: "Sat", intensity: 9 },
  { day: "Sun", intensity: 5 }
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
  intensity: {
    label: "Activity Level",
    color: "hsl(var(--secondary))",
  },
};

export default function ReportViewer() {
  const navigate = useNavigate();

  const moodEmojis = ["😊", "😌", "🙂", "😊", "😄", "😐", "🙂"];
  const averageMood = "😊";
  const averageSleep = 7.2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/my-reports")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Weekly Nutrition Report</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                January – Week 3 (01/15/2025 - 01/21/2025)
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Complete
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 1. Weekly Score Summary */}
        <Card className="visible-card section-spacing bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              📊 Weekly Score Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="text-6xl font-bold text-primary">87</div>
                <div className="text-xl text-muted-foreground">/ 100</div>
              </div>
              <div className="bg-accent/20 rounded-lg p-4">
                <p className="text-lg font-medium text-primary">
                  🎉 Excellent work this week! You're consistently hitting your nutrition targets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Nutrition Trends */}
        <Card className="visible-card section-spacing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍽️ Nutrition Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-4">Protein Intake This Week</h4>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={proteinData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="protein" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="goal" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium">✅ Nutrient Highlights</h5>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Met 89% of protein goals</li>
                  <li>• Exceeded fiber intake by 15%</li>
                  <li>• Vitamin D levels improved</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium">⚠️ Areas to Watch</h5>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>3</strong> flagged foods detected this week
                  </p>
                  <p className="text-xs text-orange-600">High sodium and processed foods</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Mood & Wellness */}
        <Card className="visible-card section-spacing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧠 Mood & Wellness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center space-y-2">
                <h4 className="font-semibold">Average Mood</h4>
                <div className="text-4xl">{averageMood}</div>
                <p className="text-sm text-muted-foreground">
                  Mood this week: {moodEmojis.join(" ")}
                </p>
              </div>
              <div className="text-center space-y-2">
                <h4 className="font-semibold">Sleep Quality</h4>
                <div className="text-2xl font-bold text-primary">{averageSleep}h</div>
                <Progress value={72} className="w-full" />
                <p className="text-xs text-muted-foreground">Average nightly sleep</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-2">💡 Wellness Tip</h5>
              <p className="text-sm text-blue-700">
                Your mood tends to improve on days with higher protein intake. Consider adding a protein-rich snack in the afternoon!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Exercise Activity */}
        <Card className="visible-card section-spacing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💪 Exercise Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center space-y-2">
                <h4 className="font-semibold">Workouts This Week</h4>
                <div className="text-4xl font-bold text-secondary">5</div>
                <p className="text-sm text-muted-foreground">out of 6 planned sessions</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Activity Intensity</h4>
                <ChartContainer config={chartConfig} className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={exerciseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="intensity" 
                        fill="hsl(var(--secondary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Progress Forecast */}
        <Card className="visible-card section-spacing bg-gradient-to-r from-green-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⏳ Progress Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Target className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold">Goal Achievement Prediction</span>
              </div>
              
              <div className="bg-white/50 p-6 rounded-lg space-y-3">
                <div className="text-2xl font-bold text-green-700">
                  🎯 At this pace, you'll hit your target in 6 weeks!
                </div>
                <Progress value={78} className="w-full h-3" />
                <p className="text-sm text-muted-foreground">
                  78% towards your ideal body composition goal
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Trending: Consistent improvement</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Coach Tips for Next Week */}
        <Card className="visible-card section-spacing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌟 Coach Tips for Next Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Personalized Recommendations
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Add a post-workout protein shake</p>
                    <p className="text-sm text-muted-foreground">Your Thursday workout could benefit from better recovery nutrition</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg">
                  <div className="w-6 h-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Try meal prep Sundays</p>
                    <p className="text-sm text-muted-foreground">Prepare healthy snacks to avoid processed food temptations</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg">
                  <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Schedule that rest day</p>
                    <p className="text-sm text-muted-foreground">Your body needs recovery - plan one complete rest day this week</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}