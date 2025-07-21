import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Droplets, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useState } from 'react';
import { useRealHydrationData } from '@/hooks/useRealHydrationData';
import { CircularProgress } from '@/components/analytics/ui/CircularProgress';

const ProgressHydration = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { weeklyChartData, weeklyAverage, isLoading, todayTotal } = useRealHydrationData();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const targetHydration = user?.targetHydration || 8; // glasses
  const hydrationTargetMl = targetHydration * 250; // Convert glasses to ml (250ml per glass)
  
  // Calculate today's hydration progress percentage
  const hydrationProgressPercent = Math.min((todayTotal / hydrationTargetMl) * 100, 100);
  
  // Get current data based on view mode
  const getCurrentData = () => {
    switch (viewMode) {
      case 'weekly':
        // For weekly view, group the last 4 weeks (simplified to last 7 days for now)
        return weeklyChartData.length > 0 ? [
          { name: 'This Week', value: weeklyAverage / 250, ml: weeklyAverage, target: targetHydration }
        ] : [];
      case 'monthly':
        // For monthly view, show average for current month (simplified)
        return weeklyChartData.length > 0 ? [
          { name: 'This Month', value: weeklyAverage / 250, ml: weeklyAverage, target: targetHydration }
        ] : [];
      default:
        // Daily view - show last 7 days
        return weeklyChartData;
    }
  };

  const currentData = getCurrentData();

  const getAverageIntake = () => {
    if (currentData.length === 0) return 0;
    const total = currentData.reduce((sum, item) => sum + (item.value || 0), 0);
    return Math.round((total / currentData.length) * 10) / 10;
  };

  const getGoalPercentage = () => {
    const averageGlasses = getAverageIntake();
    const averageMl = averageGlasses * 250; // Convert glasses to ml
    return Math.round((averageMl / hydrationTargetMl) * 100);
  };

  const getTodayStatusMessage = () => {
    const percentage = hydrationProgressPercent;
    if (percentage >= 95) return { message: "Great hydration today!", color: "text-green-600", icon: "🟢" };
    if (percentage >= 75) return { message: "Good progress!", color: "text-blue-600", icon: "💧" };
    if (percentage >= 50) return { message: "Keep drinking!", color: "text-yellow-600", icon: "🟡" };
    if (percentage === 0) return { message: "Stay hydrated!", color: "text-blue-600", icon: "💧" };
    return { message: "Need more water!", color: "text-orange-600", icon: "🟠" };
  };

  const todayStatus = getTodayStatusMessage();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
          <p className="font-medium">{`${label}: ${payload[0].value} glasses`}</p>
          {data.ml && <p className="text-sm text-gray-600 dark:text-gray-400">{`${data.ml}ml`}</p>}
          <p className="text-sm text-gray-600 dark:text-gray-400">{`Target: ${targetHydration} glasses`}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
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
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <Droplets className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                Hydration Progress
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Loading your water intake data...</p>
            </div>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
            <Droplets className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
              Hydration Progress
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Track your water intake over time</p>
          </div>
        </div>
      </div>

      {/* Today's Hydration Progress */}
      <Card className="visible-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Hydration</h3>
              <p className={`text-2xl font-bold ${todayStatus.color} flex items-center space-x-2 mt-2`}>
                <span>{todayStatus.icon}</span>
                <span>{todayStatus.message}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {todayTotal}ml / {hydrationTargetMl}ml ({Math.round(hydrationProgressPercent)}%)
              </p>
            </div>
            <div className="flex items-center justify-center">
              <CircularProgress 
                value={todayTotal}
                max={hydrationTargetMl}
                color="#3B82F6"
                size={120}
                strokeWidth={10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card - Weekly Average */}
      <Card className="visible-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Average</h3>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {getAverageIntake()} glasses ({getGoalPercentage()}% of goal)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{targetHydration}</p>
              <p className="text-xs text-gray-500">glasses</p>
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
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Water Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {currentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentData}>
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
                    y={targetHydration} 
                    stroke="#3B82F6" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Droplets className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No hydration data yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Start logging your water intake!</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center items-center space-x-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>Your intake</span>
            <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-500"></div>
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
              {currentData.length > 0 ? Math.max(...currentData.map(d => d.value)) : 0} glasses
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Lowest</h4>
            <p className="text-xl font-bold text-blue-600">
              {currentData.length > 0 ? Math.min(...currentData.map(d => d.value)) : 0} glasses
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <Droplets className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Average</h4>
            <p className="text-xl font-bold text-blue-600">
              {getAverageIntake()} glasses
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressHydration;
