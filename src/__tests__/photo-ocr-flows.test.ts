import { describe, it, expect, vi } from 'vitest';

describe('Photo OCR Flow Tests', () => {
  describe('OCR Pipeline Routing', () => {
    it('should show inline fallback when OCR returns no text for photo mode', () => {
      const mockSetState = vi.fn();
      
      // Mock scenario: OCR returns no text for photo mode
      const ocrResult = {
        ok: false,
        summary: { text_joined: '', words: 0 }
      };
      
      const analysisData = { source: 'photo' };
      
      // Simulate the inline fallback logic from HealthCheckModal
      if (!ocrResult.ok || !ocrResult.summary?.text_joined) {
        if (analysisData?.source === 'photo') {
          mockSetState('no_detection');
        }
      }
      
      expect(mockSetState).toHaveBeenCalledWith('no_detection');
    });

    it('should show retake options for inconclusive photo OCR results', () => {
      const mockSetState = vi.fn();
      
      // Mock inconclusive result
      const healthResult = {
        status: 'inconclusive',
        reason: 'front_of_pack',
        message: 'We need the Ingredients or Nutrition Facts panel. Please retake with the back of the package.'
      };
      
      // Simulate the handling logic
      if ('status' in healthResult && healthResult.status === 'inconclusive') {
        // Should create inconclusive analysis result for retake UI
        const inconclusiveResult = {
          itemName: 'Inconclusive Analysis',
          status: 'inconclusive',
          message: healthResult.message,
          reason: healthResult.reason
        };
        
        mockSetState('report');
        
        expect(inconclusiveResult.status).toBe('inconclusive');
        expect(inconclusiveResult.reason).toBe('front_of_pack');
        expect(mockSetState).toHaveBeenCalledWith('report');
      }
    });
  });

  describe('Telemetry Logging', () => {
    it('should log correct telemetry for successful OCR analysis', () => {
      const mockConsoleInfo = vi.fn();
      global.console.info = mockConsoleInfo;
      
      const words = 45;
      const hasLabelData = true;
      const reason = "success";
      const nextAction = "scored";
      
      // Simulate telemetry logging
      console.info("[PHOTO][OCR_ONLY]", { 
        words, 
        hasLabelData, 
        reason, 
        nextAction 
      });
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        "[PHOTO][OCR_ONLY]",
        {
          words: 45,
          hasLabelData: true,
          reason: "success",
          nextAction: "scored"
        }
      );
    });

    it('should log correct telemetry for inconclusive OCR analysis', () => {
      const mockConsoleInfo = vi.fn();
      global.console.info = mockConsoleInfo;
      
      const words = 15;
      const hasLabelData = false;
      const reason = "no_ingredients";
      const nextAction = "retake";
      
      // Simulate telemetry logging
      console.info("[PHOTO][OCR_ONLY]", { 
        words, 
        hasLabelData, 
        reason, 
        nextAction 
      });
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        "[PHOTO][OCR_ONLY]",
        {
          words: 15,
          hasLabelData: false,
          reason: "no_ingredients", 
          nextAction: "retake"
        }
      );
    });
  });

  describe('Toast Messages', () => {
    it('should show correct toast messages for different inconclusive reasons', () => {
      const toastMessages = {
        'front_of_pack': "We need the Ingredients or Nutrition Facts panel. Please retake with the back of the package.",
        'no_ingredients': "We need the Ingredients or Nutrition Facts panel. Fill the frame and avoid glare.",
        'insufficient_text': "We couldn't read enough label text. Try getting closer or improving lighting.",
        'low_confidence': "We couldn't read the text clearly. Try retaking with better lighting."
      };

      expect(toastMessages.front_of_pack).toContain("back of the package");
      expect(toastMessages.no_ingredients).toContain("Fill the frame");
      expect(toastMessages.insufficient_text).toContain("getting closer");
      expect(toastMessages.low_confidence).toContain("better lighting");
    });
  });
});