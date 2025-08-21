import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ShoppingCart, CreditCard, Banknote, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FunnelData {
  clicks: number;
  addToCarts: number;
  paidOrders: number;
  payouts: number;
}

interface FunnelCardsProps {
  data?: FunnelData;
  isLoading?: boolean;
}

const funnelSteps = [
  { 
    key: 'clicks', 
    label: 'Clicks', 
    icon: Eye,
    color: 'text-blue-600 dark:text-blue-400'
  },
  { 
    key: 'addToCarts', 
    label: 'Add to Cart', 
    icon: ShoppingCart,
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  { 
    key: 'paidOrders', 
    label: 'Paid Orders', 
    icon: CreditCard,
    color: 'text-green-600 dark:text-green-400'
  },
  { 
    key: 'payouts', 
    label: 'Payouts', 
    icon: Banknote,
    color: 'text-purple-600 dark:text-purple-400'
  }
];

export const FunnelCards = ({ data, isLoading }: FunnelCardsProps) => {
  const calculateConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round((current / previous) * 100);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Conversion Funnel</h4>
      
      {/* Mobile: Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:hidden">
        {funnelSteps.map((step, index) => {
          const Icon = step.icon;
          const value = data?.[step.key as keyof FunnelData] || 0;
          const nextValue = index < funnelSteps.length - 1 
            ? data?.[funnelSteps[index + 1].key as keyof FunnelData] || 0 
            : 0;
          const conversionRate = index < funnelSteps.length - 1 
            ? calculateConversionRate(nextValue, value)
            : 100;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="min-w-[140px] snap-start"
            >
              <Card className="rounded-xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${step.color}`} />
                    {index < funnelSteps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{step.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-lg font-bold tabular-nums">{value.toLocaleString()}</p>
                    )}
                    {index < funnelSteps.length - 1 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Conv rate</span>
                          <span className={conversionRate > 20 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                            {conversionRate}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-500 ${
                              conversionRate > 20 ? 'bg-green-500' : 'bg-muted-foreground'
                            }`}
                            style={{ width: `${Math.min(conversionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop: Grid */}
      <div className="hidden sm:grid grid-cols-4 gap-4">
        {funnelSteps.map((step, index) => {
          const Icon = step.icon;
          const value = data?.[step.key as keyof FunnelData] || 0;
          const nextValue = index < funnelSteps.length - 1 
            ? data?.[funnelSteps[index + 1].key as keyof FunnelData] || 0 
            : 0;
          const conversionRate = index < funnelSteps.length - 1 
            ? calculateConversionRate(nextValue, value)
            : 100;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="rounded-xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${step.color}`} />
                    {step.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
                    )}
                    
                    {index < funnelSteps.length - 1 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">to {funnelSteps[index + 1].label}</span>
                          <span className={conversionRate > 20 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                            {conversionRate}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              conversionRate > 20 ? 'bg-green-500' : 'bg-muted-foreground'
                            }`}
                            style={{ width: `${Math.min(conversionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};