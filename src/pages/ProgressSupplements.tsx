import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pill, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useState, useEffect } from 'react';
import { useRealSupplementData } from '@/hooks/useRealSupplementData';

const ProgressSupplements = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  // Get real supplement data
  const { todayCount, weeklyData: realWeeklyData, monthlyData: realMonthlyData, isLoading } = useRealSupplementData();
  
  const targetSupplements = user?.targetSupplements || 3;
  
  // Transform real data to chart format
  const dailyData = realWeeklyData.map(item => ({
    name: item.date,
    value: item.count,
    target: targetSupplements
  }));

  const weeklyData = realMonthlyData.map(item => ({
    name: item.date,
    value: item.count,
    target: targetSupplements
  }));

  const monthlyData = realMonthlyData.map(item => ({
    name: item.date,
    value: item.count,
    target: targetSupplements
  }));

  const getCurrentData = () => {
    switch (viewMode) {
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
      default: return dailyData;
    }
  };

  const getAverageIntake = () => {
    const data = getCurrentData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round((total / data.length) * 10) / 10;
  };

  const getGoalPercentage = () => {
    const average = getAverageIntake();
    return targetSupplements > 0 ? Math.round((average / targetSupplements) * 100) : 0;
  };

  const getStatusMessage = () => {
    if (isLoading) return { message: "Loading...", color: "text-gray-600", icon: "⏳" };
    if (getCurrentData().length === 0) return { message: "No data yet", color: "text-gray-600", icon: "📊" };
    
    const percentage = getGoalPercentage();
    if (percentage >= 95 && percentage <= 105) return { message: "On track!", color: "text-green-600", icon: "🟢" };
    if (percentage >= 80 && percentage <= 120) return { message: "Slightly off target", color: "text-yellow-600", icon: "🟡" };
    return { message: "Needs attention!", color: "text-red-600", icon: "🔴" };
  };

  const status = getStatusMessage();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
          <p className="font-medium">{`${label}: ${payload[0].value} pills`}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{`Target: ${targetSupplements} pills`}</p>
        </div>
      );
    }
    return null;
  };

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
          <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-rose-500 rounded-xl flex items-center justify-center">
            <Pill className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
              Supplements Progress
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Track your supplement intake over time</p>
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
                {getCurrentData().length > 0 ? (
                  <>Average: {getAverageIntake()} pills ({getGoalPercentage()}% of goal)</>
                ) : (
                  <>Today: {todayCount} pills taken</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{targetSupplements}</p>
              <p className="text-xs text-gray-500">pills</p>
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
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Supplements Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading supplement data...</p>
                </div>
              </div>
            ) : getCurrentData().length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No supplement data available</p>
                  <p className="text-sm text-gray-500 mt-2">Start logging supplements to see your progress!</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getCurrentData()}>
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
                    y={targetSupplements} 
                    stroke="#EC4899" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#EC4899" 
                    strokeWidth={3}
                    dot={{ fill: '#EC4899', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#EC4899', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center items-center space-x-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-4 h-0.5 bg-pink-500"></div>
            <span>Your intake</span>
            <div className="w-4 h-0.5 border-t-2 border-dashed border-pink-500"></div>
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
              {getCurrentData().length > 0 ? Math.max(...getCurrentData().map(d => d.value)) : 0} pills
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Lowest</h4>
            <p className="text-xl font-bold text-blue-600">
              {getCurrentData().length > 0 ? Math.min(...getCurrentData().map(d => d.value)) : 0} pills
            </p>
          </CardContent>
        </Card>
        
        <Card className="visible-card shadow-md">
          <CardContent className="p-4 text-center">
            <Pill className="h-8 w-8 text-pink-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Average</h4>
            <p className="text-xl font-bold text-pink-600">
              {getAverageIntake()} pills
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressSupplements;
