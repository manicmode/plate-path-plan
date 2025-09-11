/**
 * Report Stack - Modal containing Confirm and Reminder modals
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useState, useId } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { ReminderToggle } from '@/components/reminder/ReminderToggle';
import type { MealCaptureData } from './MealCapturePage';
import { buildLogPrefill } from '../buildLogPrefill';
import { debugLog } from '../debug';

interface ReportStackProps {
  data: MealCaptureData;
  onClose: () => void;
}

export function ReportStack({ data, onClose }: ReportStackProps) {
  const titleId = useId();
  const descId = useId();
  
  const [showConfirm, setShowConfirm] = useState(true);
  const [showReminder, setShowReminder] = useState(false);
  const [confirmData, setConfirmData] = useState<any>(null);
  
  React.useEffect(() => {
    if (data.analysisResult) {
      // Convert analysis result to format expected by FoodConfirmationCard
      const logPrefill = buildLogPrefill(data.analysisResult, data.imageUrl);
      
      const foodItem = {
        id: Date.now().toString(),
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
      debugLog('Report stack opened with food item', foodItem);
    }
  }, [data]);
  
  const handleConfirmClose = () => {
    debugLog('Confirm modal closed');
    setShowConfirm(false);
    onClose();
  };
  
  const handleConfirmSuccess = () => {
    debugLog('Food confirmed, showing reminder');
    setShowConfirm(false);
    setShowReminder(true);
  };
  
  const handleReminderClose = () => {
    debugLog('Reminder modal closed');
    setShowReminder(false);
    onClose();
  };
  
  return (
    <>
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
      
      {/* Reminder Modal */}
      {showReminder && (
        <Dialog open={showReminder} onOpenChange={setShowReminder}>
          <DialogContent 
            className="mc-reminder-dialog"
            aria-labelledby={titleId}
            aria-describedby={descId}
          >
            <VisuallyHidden>
              <DialogTitle id={titleId}>Set Reminder</DialogTitle>
              <DialogDescription id={descId}>
                Configure meal reminder settings
              </DialogDescription>
            </VisuallyHidden>
            
            <ReminderToggle
              foodName={confirmData?.name || 'Meal'}
              onReminderClose={() => {
                debugLog('Reminder set');
                handleReminderClose();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}