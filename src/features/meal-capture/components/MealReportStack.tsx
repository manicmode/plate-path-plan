/**
 * Meal Report Stack - Stacked Health Reports with individual logging
 * Revision tag: 2025-09-01T22:00Z-r1
 */

import React, { useState, useId } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft } from 'lucide-react';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { buildLogPrefill } from '../buildLogPrefill';
import type { MealCaptureData } from './MealCapturePage';

interface MealReportStackProps {
  data: MealCaptureData;
  onClose: () => void;
}

export function MealReportStack({ data, onClose }: MealReportStackProps) {
  const titleId = useId();
  const descId = useId();
  
  const [reports, setReports] = useState(data.healthReports || []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState<any>(null);
  
  const handleLogItem = (report: any) => {
    console.log('[MEAL][REPORTS][LOG]', { id: report.id, remaining: reports.length - 1 });
    
    // Convert to format expected by FoodConfirmationCard
    const logPrefill = buildLogPrefill(report, data.imageUrl);
    
    const foodItem = {
      id: report.id,
      name: logPrefill.name,
      calories: logPrefill.calories || 0,
      protein: logPrefill.protein || 0,
      carbs: logPrefill.carbs || 0,
      fat: logPrefill.fat || 0,
      fiber: logPrefill.fiber || 0,
      sodium: logPrefill.sodium || 0,
      sugar: logPrefill.sugar || 0,
      servingSize: logPrefill.serving_size || '1 serving',
      imageUrl: logPrefill.image_url,
      brand: logPrefill.brand,
      barcode: logPrefill.barcode,
      source: 'meal-capture'
    };
    
    setConfirmData(foodItem);
    setShowConfirm(true);
  };
  
  const handleConfirmSuccess = () => {
    // Remove this report from the stack
    const reportId = confirmData?.id;
    console.log('[MEAL][LOG][DONE]', { itemKey: reportId });
    
    setReports(prev => prev.filter(r => r.id !== reportId));
    setShowConfirm(false);
    setConfirmData(null);
    
    // If no more reports, close the entire stack
    if (reports.length <= 1) {
      onClose();
    }
  };
  
  const handleConfirmClose = () => {
    setShowConfirm(false);
    setConfirmData(null);
  };
  
  // If no reports left, close automatically
  if (reports.length === 0) {
    onClose();
    return null;
  }
  
  return (
    <>
      {/* Report Stack Modal */}
      <Dialog open={!showConfirm} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          className="mc-report-stack max-w-md mx-auto bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700 border-white/20"
          aria-labelledby={titleId}
          aria-describedby={descId}
        >
          <VisuallyHidden>
            <DialogTitle id={titleId}>Health Reports</DialogTitle>
            <DialogDescription id={descId}>
              Review health analysis for your meal items
            </DialogDescription>
          </VisuallyHidden>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <h2 className="text-white text-lg font-semibold">
              Health Reports ({reports.length})
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Reports Stack */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {reports.map((report) => (
              <div key={report.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                {/* Health Report Content */}
                <div className="mb-4">
                  <h3 className="text-white text-xl font-bold mb-2">{report.itemName}</h3>
                  
                  {/* Health Score */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/90">Health Score</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        report.healthScore >= 8 ? 'bg-green-500 text-white' :
                        report.healthScore >= 6 ? 'bg-yellow-500 text-black' :
                        'bg-red-500 text-white'
                      }`}>
                        {report.healthScore.toFixed(1)}
                      </div>
                      <span className="text-white/70 text-sm">/ 10</span>
                    </div>
                  </div>
                  
                  {/* Nutrition Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-white text-lg font-bold">{report.calories}</div>
                      <div className="text-white/70 text-sm">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-lg font-bold">{report.protein}g</div>
                      <div className="text-white/70 text-sm">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-lg font-bold">{report.carbs}g</div>
                      <div className="text-white/70 text-sm">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-lg font-bold">{report.fat}g</div>
                      <div className="text-white/70 text-sm">Fat</div>
                    </div>
                  </div>
                  
                  {/* Overall Rating */}
                  <div className="mb-4">
                    <div className="text-white/90 text-sm mb-1">Overall Rating</div>
                    <div className="text-green-300 font-medium">{report.overallRating}</div>
                  </div>
                </div>
                
                {/* Log Button */}
                <Button
                  onClick={() => handleLogItem(report)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Log this item
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Modal */}
      {showConfirm && confirmData && (
        <FoodConfirmationCard
          mode="manual"
          isOpen={showConfirm}
          onClose={handleConfirmClose}
          foodItem={confirmData}
          onConfirm={handleConfirmSuccess}
          onSkip={handleConfirmClose}
        />
      )}
    </>
  );
}