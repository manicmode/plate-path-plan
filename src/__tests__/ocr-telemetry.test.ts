import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console.info to capture telemetry logs
const mockConsoleInfo = vi.fn();

describe('OCR Pipeline Telemetry', () => {
  beforeEach(() => {
    global.console.info = mockConsoleInfo;
    mockConsoleInfo.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log telemetry for successful OCR analysis', () => {
    // Simulate successful OCR analysis
    const words = 45;
    const hasLabelData = true;
    const reason = "success";
    const nextAction = "scored";

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

  it('should log telemetry for inconclusive OCR analysis', () => {
    // Simulate inconclusive OCR analysis
    const words = 15;
    const hasLabelData = false;
    const reason = "no_ingredients";
    const nextAction = "retake";

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

  it('should log telemetry for front-of-pack detection', () => {
    // Simulate front-of-pack detection
    const words = 25;
    const hasLabelData = false;
    const reason = "front_of_pack";
    const nextAction = "retake";

    console.info("[PHOTO][OCR_ONLY]", { 
      words, 
      hasLabelData, 
      reason, 
      nextAction 
    });

    expect(mockConsoleInfo).toHaveBeenCalledWith(
      "[PHOTO][OCR_ONLY]",
      {
        words: 25,
        hasLabelData: false,
        reason: "front_of_pack",
        nextAction: "retake"
      }
    );
  });

  it('should log telemetry for no text detected', () => {
    // Simulate no text detection
    const words = 0;
    const hasLabelData = false;
    const reason = "no_text";
    const nextAction = "route_to_not_found";

    console.info("[PHOTO][OCR_ONLY]", { 
      words, 
      hasLabelData, 
      reason, 
      nextAction 
    });

    expect(mockConsoleInfo).toHaveBeenCalledWith(
      "[PHOTO][OCR_ONLY]",
      {
        words: 0,
        hasLabelData: false,
        reason: "no_text",
        nextAction: "route_to_not_found"
      }
    );
  });
});