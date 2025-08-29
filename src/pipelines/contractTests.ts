import { FF } from '@/featureFlags';
import { analyzeBarcode, __smokeTest as smokeBarcode } from './barcodePipeline';
import { analyzePhoto, __smokeTest as smokePhoto } from './photoPipeline';
import { analyzeVoice, __smokeTest as smokeVoice } from './voicePipeline';
import { analyzeManual, __smokeTest as smokeManual } from './manualPipeline';

export async function runPipelineContracts() {
  if (!FF.PIPELINE_ISOLATION) return { skipped: true };
  
  const results: Record<string, 'ok'|'fail'> = {};
  
  // Test barcode pipeline contract with working implementation
  try {
    const contractResult = smokeBarcode();
    results.barcode = await contractResult;
  } catch {
    results.barcode = 'fail';
  }

  // Test manual pipeline contract with working implementation
  try {
    const contractResult = smokeManual();
    results.manual = await contractResult;
  } catch {
    results.manual = 'fail';
  }

  // Test voice pipeline contract with working implementation
  try {
    const contractResult = smokeVoice();
    results.voice = await contractResult;
  } catch {
    results.voice = 'fail';
  }

  // Test photo pipeline contract (stub)
  try {
    const contractResult = smokePhoto();
    results.photo = await contractResult;
  } catch {
    results.photo = 'fail';
  }

  // Only console.log in dev; no throws
  if (import.meta.env.DEV) {
    console.log('[PIPELINE_CONTRACTS]', results);
  }
  
  return results;
}