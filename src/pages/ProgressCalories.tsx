
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useRealNutritionHistory } from '@/hooks/useRealNutritionHistory';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useState } from 'react';
import { DayDetailModal } from '@/components/analytics/DayDetailModal';
import { format, subDays } from 'date-fns';

const ProgressCalories = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const { dailyData, weeklyData, monthlyData, isLoading } = useRealNutritionHistory();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayDetail, setShowDayDetail] = useState(false);
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const targetCalories = user?.targetCalories || 2000;
  const todayProgress = getTodaysProgress();

  // Format data with fixed buckets using zero-fill helpers
  const getDailyChartData = () => {
    const end = new Date();
    const letters = ['S','M','T','W','T','F','S'];
    const start = new Date(end);
    start.setDate(end.getDate()-6);
    const map = new Map<string, number>();
    dailyData.forEach(d => map.set(d.date.slice(0,10), (map.get(d.date.slice(0,10))||0) + d.calories));
    const out: any[] = [];
    for (let i=0;i<7;i++){
      const day = new Date(start);
      day.setDate(start.getDate()+i);
      const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      out.push({ name: letters[day.getDay()], value: map.get(key) ?? 0, target: targetCalories, date: key });
    }
    return out;
  };

  const getWeeklyChartData = () => {
    // 4 buckets Wk1..Wk4 (current week = 4)
    const startOfWeek = (d: Date) => { const nd = new Date(d); const day = (nd.getDay()+6)%7; nd.setDate(nd.getDate()-day); nd.setHours(0,0,0,0); return nd; };
    const end = startOfWeek(new Date());
    const weeks: Date[] = [new Date(end)];
    for (let i=1;i<4;i++) weeks.unshift(new Date(end.getTime() - (3-i+1)*7*24*3600*1000));
    const sumByWeek = new Map<string, number>();
    weeklyData.forEach(w => { const key = w.date; sumByWeek.set(key, (sumByWeek.get(key)||0)+w.calories); });
    return weeks.map((wkStart, idx) => ({ name: `Wk ${idx+1}`, value: sumByWeek.get(`${wkStart.getFullYear()}-${String(wkStart.getMonth()+1).padStart(2,'0')}-${String(wkStart.getDate()).padStart(2,'0')}`) ?? 0, target: targetCalories, date: wkStart.toISOString().slice(0,10) }));
  };

  const getMonthlyChartData = () => {
    const end = new Date();
    const months: { y: number; m: number }[] = [];
    for (let i=11;i>=0;i--){ const d=new Date(end.getFullYear(), end.getMonth()-i, 1); months.push({ y: d.getFullYear(), m: d.getMonth()+1 }); }
    const sumByMonth = new Map<string, number>();
    monthlyData.forEach(m => { const key = m.date.slice(0,7); sumByMonth.set(key, (sumByMonth.get(key)||0)+m.calories); });
    return months.map(({y,m}, idx) => ({ name: new Date(y, m-1, 1).toLocaleString(undefined,{ month:'short'}), value: sumByMonth.get(`${y}-${String(m).padStart(2,'0')}`) ?? 0, target: targetCalories, date: `${y}-${String(m).padStart(2,'0')}` }));
  };

  const getCurrentData = () => {
    if (isLoading) return [];
    
    switch (viewMode) {
      case 'weekly': return getWeeklyChartData();
      case 'monthly': return getMonthlyChartData();
      default: return getDailyChartData();
    }
  };

  const getAverageIntake = () => {
    const data = getCurrentData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / data.length);
  };

  const getGoalPercentage = () => {
    const average = getAverageIntake();
    return Math.round((average / targetCalories) * 100);
  };

  const getStatusMessage = () => {
    const percentage = getGoalPercentage();
    if (percentage >= 95 && percentage <= 105) return { message: "On track!", color: "text-green-600", icon: "🟢" };
    if (percentage >= 80 && percentage <= 120) return { message: "Slightly off target", color: "text-yellow-600", icon: "🟡" };
    return { message: "Needs attention!", color: "text-red-600", icon: "🔴" };
  };

  const status = getStatusMessage();

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload;
      if (clickedData.date) {
        setSelectedDate(clickedData.date);
        setShowDayDetail(true);
      }
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border cursor-pointer">
          <p className="font-medium">{`${label}: ${payload[0].value} kcal`}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{`Target: ${targetCalories} kcal`}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">👆 Tap to see details</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-600 dark:text-gray-400">Loading nutrition data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/analytics')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
              Calories Progress
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Track your calorie intake over time</p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card className="visible-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Status</h3>
              <p className={`text-2xl font-bold ${status.color} flex items-center space-x-2 mt-2`}>
                <span>{status.icon}</span>
                <span>{status.message}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Average: {getAverageIntake()} kcal ({getGoalPercentage()}% of goal)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{targetCalories}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Progress Chart */}
      <Card className="visible-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Calorie Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={getCurrentData()} 
                onClick={handleChartClick}
                style={{ cursor: 'pointer' }}
              >
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={targetCalories} 
                  stroke="#F97316" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#F97316" 
                  strokeWidth={3}
                  dot={{ fill: '#F97316', strokeWidth: 2, r: 6, cursor: 'pointer' }}
                  activeDot={{ r: 8, stroke: '#F97316', strokeWidth: 2, cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center items-center space-x-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-4 h-0.5 bg-orange-500"></div>
            <span>Your intake</span>
            <div className="w-4 h-0.5 border-t-2 border-dashed border-orange-500"></div>
            <span>Target goal</span>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Highest</h4>
            <p className="text-xl font-bold text-green-600">
              {Math.max(...getCurrentData().map(d => d.value), 0)} kcal
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Lowest</h4>
            <p className="text-xl font-bold text-blue-600">
              {Math.min(...getCurrentData().map(d => d.value), 0)} kcal
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Average</h4>
            <p className="text-xl font-bold text-orange-600">
              {getAverageIntake()} kcal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        selectedDate={selectedDate}
        onEditMeal={(mealId) => {
          // Future: Navigate to meal edit page
          console.log('Edit meal:', mealId);
        }}
        onViewDay={(date) => {
          // Future: Navigate to daily summary page
          console.log('View full day:', date);
          setShowDayDetail(false);
        }}
      />
    </div>
  );
};

export default ProgressCalories;
