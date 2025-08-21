import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth";
import { TrendingUp, TrendingDown } from "lucide-react";

interface HeaderHeroProps {
  monthlyGrowth?: number;
  isLoading?: boolean;
}

export const HeaderHero = ({ monthlyGrowth, isLoading }: HeaderHeroProps) => {
  const { user } = useAuth();
  
  const displayName = user?.name || user?.email?.split('@')[0] || 'Influencer';
  const initials = user?.name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Gradient hero background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl" />
      
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-primary/20">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="text-lg font-bold bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-2xl sm:text-3xl font-bold mb-1"
            >
              Welcome back, {displayName}!
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <p className="text-muted-foreground">
                Your influence is growing
              </p>
              
              {!isLoading && monthlyGrowth !== undefined && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs font-medium">
                  {monthlyGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={monthlyGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {Math.abs(monthlyGrowth)}% month over month
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};