
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { useRealNutritionData } from '@/hooks/useRealNutritionData';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useState } from 'react';
import { DayDetailModal } from '@/components/analytics/DayDetailModal';
import { useChartDrillDown } from '@/hooks/useChartDrillDown';
import { format, subDays } from 'date-fns';

const ProgressProtein = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { selectedDate, showDayDetail, handleChartClick, closeDayDetail, handleEditMeal, handleViewDay } = useChartDrillDown();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const targetProtein = user?.targetProtein || 150;
  
  // Real data from Supabase
  const { data: dailyData, loading: dailyLoading } = useRealNutritionData(7);
  const { data: weeklyData, loading: weeklyLoading } = useRealNutritionData(28);
  const { data: monthlyData, loading: monthlyLoading } = useRealNutritionData(90);

  const getCurrentData = () => {
    switch (viewMode) {
      case 'weekly':
        const weeks = [];
        for (let i = 0; i < 4; i++) {
          const weekData = weeklyData.slice(i * 7, (i + 1) * 7);
          const avgProtein = weekData.length > 0 
            ? weekData.reduce((sum, day) => sum + day.protein, 0) / weekData.length 
            : 0;
          weeks.push({
            name: `Week ${i + 1}`,
            value: Math.round(avgProtein),
            target: targetProtein,
            date: format(subDays(new Date(), (3 - i) * 7), 'yyyy-MM-dd')
          });
        }
        return weeks;
      case 'monthly':
        const months = [];
        for (let i = 0; i < 3; i++) {
          const monthData = monthlyData.slice(i * 30, (i + 1) * 30);
          const avgProtein = monthData.length > 0 
            ? monthData.reduce((sum, day) => sum + day.protein, 0) / monthData.length 
            : 0;
          months.push({
            name: ['Jan', 'Feb', 'Mar'][i] || `Month ${i + 1}`,
            value: Math.round(avgProtein),
            target: targetProtein,
            date: format(subDays(new Date(), (2 - i) * 30), 'yyyy-MM-dd')
          });
        }
        return months;
      default:
        return dailyData.map((day, index) => ({
          name: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
          value: Math.round(day.protein),
          target: targetProtein,
          date: format(subDays(new Date(), 6 - index), 'yyyy-MM-dd')
        }));
    }
  };

  const data = getCurrentData();
  const isLoading = dailyLoading || weeklyLoading || monthlyLoading;

  const getAverageIntake = () => {
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / data.length);
  };

  const getGoalPercentage = () => {
    const average = getAverageIntake();
    return Math.round((average / targetProtein) * 100);
  };

  const getStatusMessage = () => {
    const percentage = getGoalPercentage();
    if (percentage >= 95 && percentage <= 105) return { message: "On track!", color: "text-green-600", icon: "🟢" };
    if (percentage >= 80 && percentage <= 120) return { message: "Slightly off target", color: "text-yellow-600", icon: "🟡" };
    return { message: "Needs attention!", color: "text-red-600", icon: "🔴" };
  };

  const status = getStatusMessage();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border cursor-pointer">
          <p className="font-medium">{`${label}: ${payload[0].value}g`}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{`Target: ${targetProtein}g`}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">👆 Tap to see details</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
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
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-600 rounded-xl flex items-center justify-center">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
              Protein Progress
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Track your protein intake over time</p>
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
                Average: {getAverageIntake()}g ({getGoalPercentage()}% of goal)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{targetProtein}</p>
              <p className="text-xs text-gray-500">grams</p>
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
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Protein Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={data}
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
                  y={targetProtein} 
                  stroke="#10B981" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 6, cursor: 'pointer' }}
                  activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2, cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center items-center space-x-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-4 h-0.5 bg-emerald-500"></div>
            <span>Your intake</span>
            <div className="w-4 h-0.5 border-t-2 border-dashed border-emerald-500"></div>
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
              {data.length > 0 ? Math.max(...data.map(d => d.value)) : 0}g
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Lowest</h4>
            <p className="text-xl font-bold text-blue-600">
              {data.length > 0 ? Math.min(...data.map(d => d.value)) : 0}g
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Average</h4>
            <p className="text-xl font-bold text-emerald-600">
              {getAverageIntake()}g
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={showDayDetail}
        onClose={closeDayDetail}
        selectedDate={selectedDate}
        onEditMeal={handleEditMeal}
        onViewDay={handleViewDay}
      />
    </div>
  );
};

export default ProgressProtein;
