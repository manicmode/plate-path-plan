import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Utensils, Loader2, ArrowLeft } from 'lucide-react';
import { HealthReportData } from '@/lib/health/generateHealthReport';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

interface ItemHealthReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  item: any; // DetectedFoodItem from the itemAnalysis
  baseReport?: HealthReportData;
}

export const ItemHealthReportViewer: React.FC<ItemHealthReportViewerProps> = ({
  isOpen,
  onClose,
  item,
  baseReport
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLogging, setIsLogging] = useState(false);

  // Convert item to health report format
  const itemReport: HealthReportData = {
    overallScore: item.score,
    totalCalories: item.calories,
    macroBalance: {
      // Estimate macros based on calories (rough approximation)
      protein: Math.round(item.calories * 0.2 / 4), // 20% protein
      carbs: Math.round(item.calories * 0.5 / 4), // 50% carbs  
      fat: Math.round(item.calories * 0.3 / 9) // 30% fat
    },
    flags: [
      ...item.benefits.map((benefit: string) => ({
        type: 'positive' as const,
        message: benefit,
        severity: 'low' as const
      })),
      ...item.concerns.map((concern: string) => ({
        type: 'warning' as const,
        message: concern,
        severity: 'medium' as const
      }))
    ],
    itemAnalysis: [item],
    recommendations: []
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (score >= 60) return <Info className="w-5 h-5 text-yellow-400" />;
    return <AlertTriangle className="w-5 h-5 text-red-400" />;
  };

  const getVerdictDisplay = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 70) return { text: 'Good', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 50) return { text: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { text: 'Poor', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const verdictStyle = getVerdictDisplay(item.score);

  const handleLogThisItem = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required", 
        description: "Please log in to log food items.",
        variant: "destructive"
      });
      return;
    }

    setIsLogging(true);
    try {
      console.info('[HEALTH][ITEM_VIEWER] log', { name: item.name });
      
      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = [{
        name: item.name,
        canonicalName: item.name,
        grams: 100 // Default portion for individual item
      }];

      await oneTapLog(logEntries);
      
      toast({
        title: "Food Logged",
        description: `Successfully logged ${item.name} to your diary.`,
      });
    } catch (error) {
      console.error('[HEALTH][ITEM_VIEWER][ERROR] log failed', error);
      toast({
        title: "Log Failed",
        description: "Could not log food item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-[350]" />
        <Dialog.Content
          className="fixed inset-0 z-[400] bg-gradient-to-br from-red-900/95 via-purple-900/95 to-red-800/95 backdrop-blur-sm text-white overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex h-full w-full flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-gradient-to-r from-red-900/60 to-purple-900/60 backdrop-blur-sm px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  ✨ {item.name} Health Report
                </h2>
                <p className="text-sm text-gray-300">
                  Individual food analysis
                </p>
                {/* Glowing gradient underline */}
                <div className="mt-2 w-32 h-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-transparent rounded-full opacity-60 shadow-[0_0_8px_rgba(168,85,247,0.4)]"></div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
              {/* Overall Score */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/10 border-2 border-white/20 animate-pulse">
                  <span className={`text-4xl font-bold ${getScoreColor(item.score)}`}>
                    {item.score}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${verdictStyle.bg}`}>
                    {getScoreIcon(item.score)}
                    <span className={`text-lg font-bold ${verdictStyle.color}`}>
                      {verdictStyle.text}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    {item.calories} calories analyzed
                  </p>
                </div>
              </div>

              {/* Nutrition Overview */}
              <div className="relative">
                {/* Top glowing divider */}
                <div className="mb-4 w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent shadow-[0_0_4px_rgba(168,85,247,0.3)]"></div>
                
                <div className="bg-white/8 rounded-xl p-5 border border-white/15 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    🍽️ Nutrition Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Calories</span>
                        <span className="text-white font-semibold">{item.calories}</span>
                      </div>
                       <div className="flex justify-between">
                         <span className="text-gray-300">Protein</span>
                         <span className="text-white font-semibold">{itemReport.macroBalance.protein}g</span>
                       </div>
                     </div>
                     <div className="space-y-3">
                       <div className="flex justify-between">
                         <span className="text-gray-300">Carbs</span>
                         <span className="text-white font-semibold">{itemReport.macroBalance.carbs}g</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-300">Fat</span>
                         <span className="text-white font-semibold">{itemReport.macroBalance.fat}g</span>
                       </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom glowing divider */}
                <div className="mt-4 w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent shadow-[0_0_4px_rgba(168,85,247,0.3)]"></div>
              </div>

              {/* Benefits */}
              {item.benefits.length > 0 && (
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Health Benefits
                  </h3>
                  <ul className="space-y-2">
                    {item.benefits.map((benefit: string, index: number) => (
                      <li key={index} className="text-green-200 text-sm flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {item.concerns.length > 0 && (
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-400 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Health Considerations
                  </h3>
                  <ul className="space-y-2">
                    {item.concerns.map((concern: string, index: number) => (
                      <li key={index} className="text-yellow-200 text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="sticky bottom-0 z-10 bg-gradient-to-r from-red-900/60 to-purple-900/60 backdrop-blur-sm px-5 py-4 border-t border-white/10">
              <div className="space-y-3">
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleLogThisItem}
                    disabled={isLogging}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold disabled:opacity-50"
                  >
                    {isLogging ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging...
                      </>
                    ) : (
                      <>
                        <Utensils className="w-4 h-4 mr-2" />
                        Log This Item
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Back Button */}
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full h-10 border-white/30 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Report
                </Button>
              </div>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};