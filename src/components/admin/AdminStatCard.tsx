import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AdminStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  isLoading?: boolean;
  formatValue?: (value: number | string) => string;
  className?: string;
}

const AnimatedNumber = ({ value, formatValue }: { value: number | string; formatValue?: (value: number | string) => string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value as any);
      return;
    }
    
    let startTime: number;
    const duration = 1000;
    const startValue = 0;
    const endValue = value;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.floor(easedProgress * (endValue - startValue) + startValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  if (typeof value === 'string') {
    return <span className="font-mono tabular-nums">{value}</span>;
  }
  
  return (
    <span className="font-mono tabular-nums">
      {formatValue ? formatValue(displayValue) : displayValue.toLocaleString()}
    </span>
  );
};

export const AdminStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  isLoading = false,
  formatValue,
  className 
}: AdminStatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={className}
    >
      <Card className="rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm hover:bg-card/90 dark:hover:bg-card/90 transition-all duration-300 shadow-lg hover:shadow-xl h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col justify-between h-full">
          <div className="space-y-1">
            {isLoading ? (
              <div className="h-8 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">
                <AnimatedNumber value={value} formatValue={formatValue} />
              </div>
            )}
            {/* Always render trend area for consistent height */}
            <div className="h-5 flex items-center text-xs">
              {trend && !isLoading ? (
                <>
                  <span className={`font-medium ${
                    trend.isPositive 
                      ? 'text-emerald-500' 
                      : trend.isPositive === false 
                        ? 'text-red-500' 
                        : 'text-muted-foreground'
                  }`}>
                    {trend.isPositive !== undefined && (trend.isPositive ? '+' : '')}{trend.value}
                  </span>
                  <span className="text-muted-foreground ml-1">{trend.label}</span>
                </>
              ) : (
                <span className="text-transparent">placeholder</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};