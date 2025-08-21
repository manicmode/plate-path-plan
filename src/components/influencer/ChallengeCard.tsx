import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, MoreHorizontal } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { formatMoney } from "@/data/influencers/useInfluencerEarnings";

interface ChallengeCardProps {
  title: string;
  participants: number;
  revenue: number;
  status: 'active' | 'completed' | 'draft';
  revenueData?: number[];
  currency?: string;
  onManage?: () => void;
  className?: string;
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  draft: { label: 'Draft', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' }
};

export const ChallengeCard = ({
  title,
  participants,
  revenue,
  status,
  revenueData = [],
  currency = 'USD',
  onManage,
  className = ""
}: ChallengeCardProps) => {
  const statusStyle = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className={className}
    >
      <Card className="h-full rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur hover:bg-white/10 dark:hover:bg-black/30 transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-medium leading-tight pr-2">
              {title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={onManage}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <Badge className={`w-fit text-xs ${statusStyle.color} border-0`}>
            {statusStyle.label}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Participants</p>
                <p className="font-semibold tabular-nums">{participants.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Revenue</p>
                <p className="font-semibold tabular-nums">{formatMoney(revenue, currency)}</p>
              </div>
            </div>
          </div>

          {/* Revenue Trend & Badge */}
          {revenueData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Last 7 days
                </span>
                {revenue > 500000 && ( // $5000+
                  <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-0 text-xs px-1.5 py-0.5">
                    🏆 Top Earner
                  </Badge>
                )}
              </div>
              <Sparkline 
                data={revenueData} 
                width={200} 
                height={24} 
                className="w-full"
              />
            </motion.div>
          )}

          {/* Action Button */}
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full mt-4"
            onClick={onManage}
          >
            Manage
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};