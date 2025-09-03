import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { HealthReportData } from '@/lib/health/generateHealthReport';

interface HealthReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: HealthReportData;
}

export const HealthReportViewer: React.FC<HealthReportViewerProps> = ({
  isOpen,
  onClose,
  report
}) => {
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

  const verdictStyle = getVerdictDisplay(report.overallScore);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-[250]" />
        <Dialog.Content
          className="fixed inset-0 z-[300] bg-gradient-to-br from-red-900/95 via-purple-900/95 to-red-800/95 backdrop-blur-sm text-white overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex h-full w-full flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-gradient-to-r from-red-900/60 to-purple-900/60 backdrop-blur-sm px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  📊 Health Report
                </h2>
                <p className="text-sm text-gray-300">
                  Nutritional analysis of your meal
                </p>
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
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
              {/* Overall Score */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 border-2 border-white/20">
                  <span className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${verdictStyle.bg}`}>
                    {getScoreIcon(report.overallScore)}
                    <span className={`font-semibold ${verdictStyle.color}`}>
                      {verdictStyle.text}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Based on nutritional analysis of your meal
                  </p>
                </div>
              </div>

              {/* Nutrition Overview */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 text-white">Nutrition Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Calories</span>
                      <span className="text-white font-semibold">{Math.round(report.totalCalories)}</span>
                    </div>
                     <div className="flex justify-between">
                       <span className="text-gray-300">Protein</span>
                       <span className="text-white font-semibold">{Math.round(report.macroBalance.protein)}g</span>
                     </div>
                   </div>
                   <div className="space-y-3">
                     <div className="flex justify-between">
                       <span className="text-gray-300">Carbs</span>
                       <span className="text-white font-semibold">{Math.round(report.macroBalance.carbs)}g</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-300">Fat</span>
                       <span className="text-white font-semibold">{Math.round(report.macroBalance.fat)}g</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Individual Items */}
              {report.itemAnalysis.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">Item Analysis</h3>
                  <div className="space-y-3">
                    {report.itemAnalysis.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.name}</p>
                           <div className="flex items-center gap-4 text-sm text-gray-300 mt-1">
                             <span>{item.calories} cal</span>
                             <span>Health rating: {item.healthRating}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getScoreIcon(item.score)}
                          <span className={`font-semibold ${getScoreColor(item.score)}`}>
                            {item.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flags Display */}
              {report.flags.length > 0 && (
                <div className="space-y-4">
                  {/* Positive flags */}
                  {report.flags.filter(flag => flag.type === 'positive').length > 0 && (
                    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                      <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Health Benefits
                      </h3>
                      <ul className="space-y-2">
                        {report.flags.filter(flag => flag.type === 'positive').map((flag, index) => (
                          <li key={index} className="text-green-200 text-sm flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            {flag.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warning flags */}
                  {report.flags.filter(flag => flag.type === 'warning').length > 0 && (
                    <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                      <h3 className="text-lg font-semibold mb-3 text-yellow-400 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5" />
                        Health Considerations
                      </h3>
                      <ul className="space-y-2">
                        {report.flags.filter(flag => flag.type === 'warning').map((flag, index) => (
                          <li key={index} className="text-yellow-200 text-sm flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            {flag.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations.length > 0 && (
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <h3 className="text-lg font-semibold mb-3 text-blue-400 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, index) => (
                      <li key={index} className="text-blue-200 text-sm flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="sticky bottom-0 z-10 bg-gradient-to-r from-red-900/60 to-purple-900/60 backdrop-blur-sm px-5 py-4 border-t border-white/10">
              <Button
                onClick={onClose}
                className="w-full h-12 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold"
              >
                Close Report
              </Button>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};