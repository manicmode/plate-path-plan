/**
 * Type helpers for OCR Result handling
 */

import type { OCRReportResult, InconclusiveResult } from './toReportInputFromOCR';

export function isInconclusiveResult(result: OCRReportResult): result is InconclusiveResult {
  return 'status' in result && result.status === 'inconclusive';
}

export function isSuccessResult(result: OCRReportResult): result is { ok: true, report: any } {
  return 'ok' in result && result.ok === true;
}

export function isErrorResult(result: OCRReportResult): result is { ok: false, reason: string } {
  return 'ok' in result && result.ok === false;
}