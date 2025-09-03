import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Save, Utensils, Loader2, ChevronRight } from 'lucide-react';
import { HealthReportData, mapPhotoReportToNutritionLog } from '@/lib/health/generateHealthReport';
import { saveScanToNutritionLogs } from '@/services/nutritionLogs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { toProductModelFromDetected } from '@/lib/health/toProductModelFromDetected';

interface HealthReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: HealthReportData;
  items: ReviewItem[];
}

export const HealthReportViewer: React.FC<HealthReportViewerProps> = ({
  isOpen,
  onClose,
  report,
  items
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [healthCheckModalOpen, setHealthCheckModalOpen] = useState(false);
  const [selectedItemAnalysisData, setSelectedItemAnalysisData] = useState<any>(null);
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

  const handleSaveReport = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save health reports.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      console.info('[HEALTH][REPORT] saving', { items: items.length });
      
      // Map photo report to nutrition_logs format (same as barcode)
      const nutritionLogData = mapPhotoReportToNutritionLog(report, items);
      
      // Use same persistence as barcode reports
      const savedLog = await saveScanToNutritionLogs(nutritionLogData, 'photo');
      
      console.info('[HEALTH][REPORT] saved', { id: savedLog?.id });
      
      toast({
        title: "Report Saved",
        description: "Your health report has been saved to your history.",
      });
    } catch (error) {
      console.error('[HEALTH][REPORT][ERROR] save failed', error);
      toast({
        title: "Save Failed",
        description: "Could not save your health report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogThis = async () => {
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
      console.info('[HEALTH][REPORT] log', { items: items.length });
      
      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = items.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await oneTapLog(logEntries);
      
      toast({
        title: "Food Logged",
        description: `Successfully logged ${items.length} item${items.length > 1 ? 's' : ''} to your diary.`,
      });
    } catch (error) {
      console.error('[HEALTH][REPORT][ERROR] log failed', error);
      toast({
        title: "Log Failed",
        description: "Could not log food items. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLogging(false);
    }
  };

  const handleItemClick = async (index: number) => {
    console.log('🔴 CLICK TEST - Item clicked:', index);
    
    const item = report.itemAnalysis[index];
    console.info('[HEALTH][PHOTO_ITEM] tap', { name: item?.name });

    const base = toProductModelFromDetected(item);
    
    const ENABLE_GENERIC = import.meta.env.VITE_ENABLE_GENERIC_FOODS === 'true';
    let product = base;

    if (ENABLE_GENERIC) {
      const { resolveGenericFood } = await import('@/health/generic/resolveGenericFood');
      const { productFromGeneric } = await import('@/health/generic/mapToProductModel');
      
      const g = resolveGenericFood(item.name);

      if (g) {
        console.info('[HEALTH][GENERIC] matched', { slug: g.slug });

        const genericPM = productFromGeneric(g);

        // Merge: prefer detected serving grams if present, else generic's;
        // Fill missing nutrients from generic.
        product = {
          ...genericPM,
          ...base,
          serving: {
            grams: base?.serving?.grams ?? genericPM.serving?.grams ?? null,
            label: base?.serving?.label ?? genericPM.serving?.label ?? 'per item',
          },
          nutrients: {
            calories: base?.nutrients?.calories ?? genericPM.nutrients?.calories ?? null,
            protein_g: base?.nutrients?.protein_g ?? genericPM.nutrients?.protein_g ?? null,
            carbs_g: base?.nutrients?.carbs_g ?? genericPM.nutrients?.carbs_g ?? null,
            fat_g: base?.nutrients?.fat_g ?? genericPM.nutrients?.fat_g ?? null,
            fiber_g: base?.nutrients?.fiber_g ?? genericPM.nutrients?.fiber_g ?? null,
            sugar_g: base?.nutrients?.sugar_g ?? genericPM.nutrients?.sugar_g ?? null,
            sodium_mg: base?.nutrients?.sodium_mg ?? genericPM.nutrients?.sodium_mg ?? null,
          },
        };
      } else {
        console.warn('[HEALTH][GENERIC] no_match', { name: item.name });
      }
    }

    // Set up analysis data for HealthCheckModal and open it
    console.log('🔴 SETTING MODAL DATA');
    console.info('[HEALTH][DEBUG] Setting up modal data:', {
      source: 'photo_item',
      name: item.name,
      hasProduct: !!(product || base),
      productName: (product || base)?.name
    });
    
    setSelectedItemAnalysisData({
      source: 'photo_item',
      name: item.name,
      product: product || base,
      captureTs: Date.now()
    });
    
    console.log('🔴 OPENING MODAL');
    setHealthCheckModalOpen(true);
    console.info('[HEALTH][OPEN_FULL]', { source: 'photo_item', name: product?.name || item.name });
  };

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
                  ✨ Your Health Report
                </h2>
                <p className="text-sm text-gray-300">
                  Nutritional analysis of your meal
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
                  <span className={`text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${verdictStyle.bg}`}>
                    {getScoreIcon(report.overallScore)}
                    <span className={`text-lg font-bold ${verdictStyle.color}`}>
                      {verdictStyle.text}
                    </span>
                  </div>
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
                
                {/* Bottom glowing divider */}
                <div className="mt-4 w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent shadow-[0_0_4px_rgba(168,85,247,0.3)]"></div>
              </div>

              {/* Individual Items */}
              {report.itemAnalysis.length > 0 && (
                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h3 className="text-xl font-bold mb-5 text-white flex items-center gap-2">
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      👆 Tap a food for the full report
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {report.itemAnalysis.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ease-in-out cursor-pointer hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 active:scale-[0.98]"
                        tabIndex={0}
                        role="button"
                         onClick={(e) => {
                           console.log('🔴 RAW CLICK EVENT FIRED', e.target);
                           e.stopPropagation();
                           handleItemClick(index);
                         }}
                         onKeyDown={(e) => {
                           console.log('🔴 KEY EVENT FIRED', e.key);
                           if (e.key === 'Enter' || e.key === ' ') {
                             e.preventDefault();
                             e.stopPropagation();
                             handleItemClick(index);
                           }
                         }}
                        aria-label={`View details for ${item.name} - ${item.calories} calories, health rating ${item.healthRating}`}
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.name}</p>
                           <div className="flex items-center gap-4 text-sm text-gray-300 mt-1">
                             <span>{item.calories} cal</span>
                             <span>Health rating: {item.healthRating}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getScoreIcon(item.score)}
                            <span className={`font-semibold ${getScoreColor(item.score)}`}>
                              {item.score}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
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
              <div className="space-y-3">
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleSaveReport}
                    disabled={isSaving}
                    className="h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Report
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleLogThis}
                    disabled={isLogging}
                    className="h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold disabled:opacity-50"
                  >
                    {isLogging ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging...
                      </>
                    ) : (
                      <>
                        <Utensils className="w-4 h-4 mr-2" />
                        Log This
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Close Button */}
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full h-10 border-white/30 text-white hover:bg-white/10"
                >
                  Close Report
                </Button>
              </div>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Full Health Check Modal - render at document root to ensure visibility */}
      {healthCheckModalOpen && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>
            🔴 MODAL IS VISIBLE - Click anywhere to close
            <br />
            Item: {selectedItemAnalysisData?.name}
            <br />
            <button 
              onClick={() => {
                console.log('[HEALTH][MODAL_CLOSE] Test close clicked');
                setHealthCheckModalOpen(false);
                setSelectedItemAnalysisData(null);
              }}
              style={{ 
                padding: '10px 20px', 
                marginTop: '10px',
                backgroundColor: 'red',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              CLOSE TEST MODAL
            </button>
          </div>
          <HealthCheckModal
            isOpen={healthCheckModalOpen}
            onClose={() => {
              console.log('[HEALTH][MODAL_CLOSE] User closed photo item modal');
              setHealthCheckModalOpen(false);
              setSelectedItemAnalysisData(null);
            }}
            initialState="report"
            disableQuickScan={true}
            analysisData={selectedItemAnalysisData}
          />
        </div>,
        document.body
      )}
    </Dialog.Root>
  );
};