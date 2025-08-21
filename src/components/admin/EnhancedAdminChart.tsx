import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  date?: string;
}

interface EnhancedAdminChartProps {
  title: string;
  data: number[];
  icon: LucideIcon;
  type?: 'line' | 'area';
  color?: string;
  gradient?: boolean;
  className?: string;
}

export const EnhancedAdminChart = ({
  title,
  data,
  icon: Icon,
  type = 'area',
  color = 'hsl(var(--primary))',
  gradient = true,
  className
}: EnhancedAdminChartProps) => {
  // Transform data for recharts
  const chartData: ChartData[] = data.map((value, index) => ({
    name: `Day ${index + 1}`,
    value,
    date: new Date(Date.now() - (data.length - 1 - index) * 24 * 60 * 60 * 1000).toLocaleDateString()
  }));

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg"
        >
          <p className="text-sm font-medium text-foreground">{payload[0].payload.date}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Value: {payload[0].value.toLocaleString()}
          </p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm hover:bg-card/90 dark:hover:bg-card/90 transition-all duration-300 shadow-lg hover:shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Icon className="h-4 w-4 text-primary" />
            </motion.div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    hide 
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={gradient ? `url(#${gradientId})` : color}
                    fillOpacity={gradient ? 1 : 0.1}
                    dot={{ fill: color, strokeWidth: 2, r: 3 }}
                    activeDot={{ 
                      r: 4, 
                      fill: color, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 2,
                      style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }
                    }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="name" 
                    hide 
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 2, r: 3 }}
                    activeDot={{ 
                      r: 4, 
                      fill: color, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 2,
                      style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }
                    }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Mini stats */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Avg: {Math.round(data.reduce((a, b) => a + b, 0) / data.length).toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                Peak: {Math.max(...data).toLocaleString()}
              </span>
            </div>
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};