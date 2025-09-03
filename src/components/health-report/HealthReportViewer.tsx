import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Save, Utensils, Loader2, ChevronRight, Zap } from 'lucide-react';
import { HealthReportData, mapPhotoReportToNutritionLog } from '@/lib/health/generateHealthReport';
import { saveScanToNutritionLogs } from '@/services/nutritionLogs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { toProductModelFromDetected } from '@/lib/health/toProductModelFromDetected';
import { SaveSetNameDialog } from '@/components/camera/SaveSetNameDialog';
import { supabase } from '@/integrations/supabase/client';
import { ReviewItemsScreen } from '@/components/camera/ReviewItemsScreen';
import { useSound } from '@/contexts/SoundContext';
import { lightTap } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';

interface HealthReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: HealthReportData;
  items: ReviewItem[];
  // Modal opening functions for photo item clicks
  onOpenHealthModal?: (analysisData: any) => void;
  // Remove old interface props - using global confirm flow now  
  // onStartConfirmFlow?: (items: any[], origin: string) => void;
}

export const HealthReportViewer: React.FC<HealthReportViewerProps> = ({
  isOpen,
  onClose,
  report,
  items,
  onOpenHealthModal
  // onStartConfirmFlow - removed, using global flow
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playFoodLogConfirm } = useSound();
  const [isSaving, setIsSaving] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [showSaveNameDialog, setShowSaveNameDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
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

  const handleSaveReportSet = () => {
    console.log('[DEBUG] handleSaveReportSet called', { userId: user?.id, isSaved });
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save health reports.",
        variant: "destructive"
      });
      return;
    }

    setShowSaveNameDialog(true);
  };

  const handleSaveWithName = async (setName: string) => {
    console.log('[DEBUG] handleSaveWithName called', { setName });
    setIsSaving(true);
    try {
      // Always use new behavior - save to saved_meal_set_reports
      console.info('[SAVE][SET]', { items: items.length, name: setName });
      
      const itemsSnapshot = items.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100,
        score: report.itemAnalysis.find(a => a.name === item.name)?.score || 0,
        calories: report.itemAnalysis.find(a => a.name === item.name)?.calories || 0,
        healthRating: report.itemAnalysis.find(a => a.name === item.name)?.healthRating || 'unknown'
      }));

      console.log('[DEBUG] About to insert to supabase', { itemsSnapshot });

      const { data, error } = await supabase
        .from('saved_meal_set_reports')
        .insert({
          name: setName.trim(),
          overall_score: Math.round(report.overallScore),
          items_snapshot: itemsSnapshot,
          report_snapshot: report,
          user_id: user.id,
          image_url: null // Could add later if needed
        } as any)
        .select('id')
        .single();

      if (error) {
        console.error('[DEBUG] Supabase error:', error);
        throw error;
      }

      console.log('[DEBUG] Save successful, setting isSaved to true');
      console.info('[SAVE][SET] inserted', { 
        id: data.id, 
        name: setName, 
        overall: report.overallScore, 
        items: itemsSnapshot?.length 
      });
      
      toast({
        title: "Report Set Saved",
        description: `"${setName}" has been saved to your meal set reports.`,
      });
      
      setShowSaveNameDialog(false);
      setIsSaved(true); // Show checkmark state
      console.log('[DEBUG] isSaved state set to true');
    } catch (error) {
      console.error('[HEALTH][REPORT][ERROR] save failed', error);
      toast({
        title: "Save Failed",
        description: "Could not save your health report set. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOneClickLog = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required", 
        description: "Please log in to log food items.",
        variant: "destructive"
      });
      return;
    }

    // Debounce protection
    if (isLogging) return;

    setIsLogging(true);
    
    try {
      // Debug logging (gated behind VITE_LOG_DEBUG)
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.info('[LOG][ONE_CLICK] start', { 
          count: items.length,
          items: items.map(i => ({ n: i.name, g: i.grams || 100 }))
        });
      }
      
      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = items.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await oneTapLog(logEntries);
      
      // Play success sound/haptic (wrapped in try/catch so they never block navigation)
      try {
        playFoodLogConfirm();
        lightTap();
      } catch (soundError) {
        console.debug('Sound/haptic error (non-blocking):', soundError);
      }
      
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.info('[LOG][ONE_CLICK] done');
      }
      
      toast({
        title: "Food Logged",
        description: `Successfully logged ${items.length} item${items.length > 1 ? 's' : ''} to your diary.`,
      });
      
      // Close Health Report
      onClose();
      
      // Navigate to Home using same pattern as other logging flows
      navigate('/home', { replace: true });
      
    } catch (error) {
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.error('[LOG][ONE_CLICK] failed', error);
      }
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

  const handleDetailedLog = async () => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][CTA] clicked', { count: items.length });
      console.info('[DL][CTA] items', items.map(i => i.name));
    }
    
    // Use existing confirm flow directly
    const { beginConfirmSequence } = await import('@/lib/confirmFlow');
    
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][CTA] start', items.map(i => i.name));
    }
    
    beginConfirmSequence(items, { origin: 'health_report' });
  };

  const handleItemClick = async (index: number) => {
    console.log('🟡 [STEP 1] handleItemClick called', { index });
    
    const item = report.itemAnalysis[index];
    console.log('🟡 [STEP 2] Analysis item retrieved', { analysisItem: item });
    console.info('[HEALTH][PHOTO_ITEM]->[FULL_REPORT]', { name: item?.name });

    if (!onOpenHealthModal) {
      console.error('🔴 [STEP 3] onOpenHealthModal is missing!');
      toast({
        title: "Feature Unavailable",
        description: "Health modal is not available in this context",
        variant: "destructive"
      });
      return;
    }
    
    console.log('🟢 [STEP 3] onOpenHealthModal exists');

    try {
      console.log('🟡 [STEP 4] Finding original ReviewItem...');
      
      // Find the original ReviewItem that corresponds to this analysis item
      const reviewItem = items.find(reviewItem => reviewItem.name === item.name);
      console.log('🟡 [STEP 5] ReviewItem found', { reviewItem, availableItems: items.map(i => i.name) });
      
      if (!reviewItem) {
        console.error('🔴 [STEP 6] No matching ReviewItem found!');
        throw new Error(`Could not find original item data for ${item.name}`);
      }

      console.log('🟡 [STEP 7] Calling toProductModelFromDetected with ReviewItem...');
      const { toProductModelFromDetected } = await import('@/lib/health/toProductModelFromDetected');
      const product = await toProductModelFromDetected(reviewItem);
      console.log('🟢 [STEP 8] ProductModel created', { product });
      
      if (product.source === 'photo_item' && product.meta) {
        console.log('🟡 [STEP 9] Creating analysisData...');
        
        // Create analysis object with proper nutrition data for HealthCheckModal
        const analysisData = {
          source: 'photo_item',
          product: {
            ...product,
            // Ensure ingredients and flags are available for the modal
            ingredientsText: product.meta?.ingredients?.join(', ') || product.name,
            ingredients: product.meta?.ingredients || [product.name],
            flags: product.meta?.flags || [],
            // Set serving size grams for per-portion calculation
            servingSizeGrams: product.meta?.portion?.grams,
          },
          productName: product.name,
          captureTs: Date.now(),
          meta: {
            ...product.meta,
            source: 'photo_item',
            detectedName: item.name,
          },
          nutrition: {
            per100g: product.meta.per100g,
            perPortion: product.meta.perPortion,
            basis: product.meta.perPortion ? 'portion' : '100g',
          }
        };
        
        console.log('🟡 [STEP 10] Calling onOpenHealthModal...', { analysisData });
        onOpenHealthModal(analysisData);
        console.log('🟢 [STEP 11] Modal opening completed');
      } else {
        console.error('🔴 [STEP 9] Product not photo_item or missing meta', { source: product.source, hasMeta: !!product.meta });
        toast({
          title: "Nutrition Data Unavailable",
          description: `Detailed nutrition data not available for ${item.name}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🔴 [ERROR] handleItemClick failed:', error.message);
      console.error('🔴 [ERROR] Stack:', error.stack);
      toast({
        title: "Error Opening Health Report",
        description: "Could not open detailed health report for this item",
        variant: "destructive"
      });
    }
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
                
                {/* Overall Score Label */}
                <div className="text-white/80 text-sm font-medium">
                  Overall Score
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
                           console.log('🔴 RAW CLICK EVENT FIRED', e.target, e.currentTarget);
                           console.log('🔴 CLICK POSITION', e.clientX, e.clientY);
                           e.preventDefault();
                           e.stopPropagation();
                           handleItemClick(index);
                         }}
                         onKeyDown={(e) => {
                           console.log('🔴 KEY EVENT FIRED', e.key, e.target);
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
                {/* Logging Buttons Row */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleOneClickLog}
                    disabled={isLogging}
                    className="h-11 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold text-sm"
                  >
                    {isLogging ? '⏳ Logging...' : `⚡ One-Click Log`}
                  </Button>
                  
                  <Button
                    onClick={handleDetailedLog}
                    className="h-11 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-sm"
                  >
                    🔎 Detailed Log
                  </Button>
                </div>

                {/* Save Report Set Button */}
                <div className="space-y-3">
                  <Button
                    onClick={handleSaveReportSet}
                    disabled={isSaving || isSaved}
                     className={`w-full py-4 text-base font-medium rounded-xl transition-all duration-200 ${
                       isSaved 
                         ? 'bg-green-700 text-white cursor-default' 
                         : 'bg-green-600 hover:bg-green-700 text-white'
                     }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving Report Set...
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        ✅ Report Set Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        💾 Save Report Set
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

      {/* Save Set Name Dialog */}
      <SaveSetNameDialog
        isOpen={showSaveNameDialog}
        onClose={() => {
          console.log('[DEBUG] SaveSetNameDialog onClose called');
          setShowSaveNameDialog(false);
        }}
        onSave={handleSaveWithName}
      />
    </Dialog.Root>
  );
};