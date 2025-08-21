import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { formatMoney } from "@/data/influencers/useInfluencerEarnings";

interface TopChallenge {
  challenge_id: string;
  challenge_title: string;
  total_revenue_cents: number;
}

interface TopChallengesListProps {
  challenges: TopChallenge[];
  currency?: string;
  isLoading?: boolean;
}

const getRankIcon = (index: number) => {
  switch (index) {
    case 0: return { icon: Trophy, color: "text-yellow-500" };
    case 1: return { icon: Medal, color: "text-gray-400" };
    case 2: return { icon: Award, color: "text-amber-600" };
    default: return { icon: null, color: "" };
  }
};

const getRankBadge = (index: number) => {
  switch (index) {
    case 0: return "🥇";
    case 1: return "🥈";  
    case 2: return "🥉";
    default: return `#${index + 1}`;
  }
};

export const TopChallengesList = ({ 
  challenges, 
  currency = 'USD', 
  isLoading 
}: TopChallengesListProps) => {
  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
        <CardHeader>
          <CardTitle>Top Earning Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
        <CardHeader>
          <CardTitle>Top Earning Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No paid orders yet.</p>
            <p className="text-sm mt-1">Start promoting your challenges to see earnings here!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top Earning Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <div className="space-y-3">
            {challenges.map((challenge, index) => {
              const { icon: Icon, color } = getRankIcon(index);
              
              return (
                <motion.div
                  key={challenge.challenge_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-black/10 hover:bg-white/10 dark:hover:bg-black/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {Icon ? (
                        <Icon className={`h-5 w-5 ${color}`} />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{challenge.challenge_title}</p>
                      <p className="text-xs text-muted-foreground">Challenge #{index + 1}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold tabular-nums">
                      {formatMoney(challenge.total_revenue_cents, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile Stacked View */}
        <div className="sm:hidden space-y-3">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.challenge_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-white/5 dark:bg-black/10 border border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-primary/10 text-primary border-0">
                  {getRankBadge(index)}
                </Badge>
                <span className="font-bold text-lg tabular-nums">
                  {formatMoney(challenge.total_revenue_cents, currency)}
                </span>
              </div>
              
              <h4 className="font-medium mb-1">{challenge.challenge_title}</h4>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};