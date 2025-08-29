import { FF } from '@/featureFlags';
import { analyzeBarcode } from './barcodePipeline';
import { analyzePhoto } from './photoPipeline';
import { analyzeVoice } from './voicePipeline';
import { analyzeManual } from './manualPipeline';

export async function runPipelineContracts() {
  if (!FF.PIPELINE_ISOLATION) return { skipped: true };
  
  const results: Record<string, 'ok'|'fail'> = {};
  
  // Test barcode pipeline contract
  try {
    const result = await analyzeBarcode({ code: 'test' });
    results.barcode = result.ok === false && result.reason === 'dark' ? 'ok' : 'fail';
  } catch {
    results.barcode = 'fail';
  }

  // Test manual pipeline contract
  try {
    const result = await analyzeManual({ query: 'test' });
    results.manual = result.ok === false && result.reason === 'dark' ? 'ok' : 'fail';
  } catch {
    results.manual = 'fail';
  }

  // Test voice pipeline contract
  try {
    const result = await analyzeVoice({ transcript: 'test' });
    results.voice = result.ok === false && result.reason === 'dark' ? 'ok' : 'fail';
  } catch {
    results.voice = 'fail';
  }

  // Test photo pipeline contract
  try {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const result = await analyzePhoto({ blob });
    results.photo = result.ok === false && result.reason === 'dark' ? 'ok' : 'fail';
  } catch {
    results.photo = 'fail';
  }

  // Only console.log in dev; no throws
  if (import.meta.env.DEV) {
    console.log('[PIPELINE_CONTRACTS]', results);
  }
  
  return results;
}