import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string;
  isPositive?: boolean;
  isLoading?: boolean;
  testId?: string;
}

const AnimatedNumber = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const startValue = 0;
    const endValue = value;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span className="tabular-nums">{displayValue.toLocaleString()}</span>;
};

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  delta, 
  isPositive, 
  isLoading,
  testId 
}: StatCardProps) => {
  const numericValue = typeof value === 'number' ? value : 0;
  const shouldAnimate = typeof value === 'number' && numericValue > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card 
        className="h-full rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur hover:bg-white/10 dark:hover:bg-black/30 transition-all duration-200"
        data-testid={testId}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl sm:text-3xl font-bold mb-1">
            {isLoading ? (
              <div className="h-8 bg-muted/50 rounded animate-pulse" />
            ) : shouldAnimate ? (
              <AnimatedNumber value={numericValue} />
            ) : (
              <span className="tabular-nums">{value}</span>
            )}
          </div>
          
          {delta && !isLoading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className={`text-xs font-medium ${
                isPositive 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {delta}
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};