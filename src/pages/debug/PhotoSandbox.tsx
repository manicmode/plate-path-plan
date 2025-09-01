import React, { useEffect, useRef, useState, useCallback } from 'react';
import { resolveFunctionsBase } from '@/lib/net/functionsBase';
import { getAuthHeaders } from '@/lib/net/authHeaders';
// Import the new shared parser approach
import { toReportFromOCR } from '@/lib/health/adapters/toReportInputFromOCR';
import { isSuccessResult, isErrorResult } from '@/lib/health/adapters/ocrResultHelpers';
import { FF } from '@/featureFlags';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PingStatus {
  status: 'loading' | 'ok' | 'fail';
  data?: any;
  lastPing?: Date;
}

interface OCRRun {
  id: string;
  timestamp: Date;
  duration: number;
  status: string;
  score?: number | null;
  flagsCount: number;
  origin?: string;
  hasAuth?: boolean;
  textPreview?: string;
  healthReport?: any; // Store the full health report
}

interface LogEntry {
  timestamp: Date;
  level: 'START' | 'HEADERS' | 'REQUEST' | 'RESPONSE' | 'REPORT' | 'END' | 'ERROR' | 'HEALTH' | 'WARN' | 'MEAL';
  message: string;
  data?: any;
}

export default function PhotoSandbox() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pingStatus, setPingStatus] = useState<PingStatus>({ status: 'loading' });
  const [isRunningE2E, setIsRunningE2E] = useState(false);
  const [ocrHistory, setOcrHistory] = useState<OCRRun[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<OCRRun | null>(null);
  const { toast } = useToast();

  // Redact sensitive data from headers/tokens
  const redactToken = (token: string): string => {
    if (token.startsWith('Bearer ')) {
      return `Bearer ***${token.slice(-8)}`;
    }
    return `***${token.slice(-8)}`;
  };

  const addLogEntry = useCallback((level: LogEntry['level'], message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data
    };
    
    setLogEntries(prev => [...prev.slice(-199), entry]); // Keep last 200 entries
    
    // Console logging with groups
    const groupTag = `[OCR][E2E][${level}]`;
    console.group(groupTag);
    console.log(message, data || '');
    console.groupEnd();
  }, []);

  const log = (msg: string, data?: any) => {
    const line = data ? `${msg} ${JSON.stringify(data)}` : msg;
    console.log(line);
    if (logRef.current) {
      const row = document.createElement('div');
      row.textContent = line;
      logRef.current.appendChild(row);
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    console.log('[ROUTE]', window.location.pathname);
    
    (async () => {
      // Auto-ping on mount
      await ping({ withAuth: true });
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
          log('[SANDBOX] camera ready');
        }
      } catch (e) {
        log('[SANDBOX][ERR] getUserMedia', String(e));
      }
    })();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const runE2ETakePhotoCheck = async () => {
    if (!ready || !videoRef.current) {
      toast({ title: "Camera not ready", variant: "destructive" });
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const runId = `e2e_${Date.now()}`;
    const startTime = Date.now();
    abortControllerRef.current = new AbortController();
    
    try {
      setIsRunningE2E(true);
      addLogEntry('START', `E2E Take Photo Check started`, { runId });

      // 1. Capture video frame as JPEG (quality ~0.85)
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');
      
      ctx.drawImage(video, 0, 0);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.85);
      });

      addLogEntry('REQUEST', `Image captured`, { 
        bytes: blob.size, 
        mime: blob.type,
        dimensions: `${canvas.width}x${canvas.height}`
      });

      // 2. Get auth headers and setup request
      const headers = await getAuthHeaders(true);
      const redactedHeaders = {
        ...headers,
        Authorization: headers.Authorization ? redactToken(headers.Authorization) : undefined,
        apikey: headers.apikey ? redactToken(headers.apikey) : undefined
      };
      
      addLogEntry('HEADERS', `Auth headers prepared`, redactedHeaders);

      // 3. Setup timeout watchdog (12s)
      timeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          toast({ 
            title: "OCR timed out", 
            description: "Try again or use manual entry",
            variant: "destructive" 
          });
        }
      }, 12000);

      // 4. Convert blob to base64 for meal-detector
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.readAsDataURL(blob);
      });

      // 5. Call meal-detector only (OCR OFF)
      const { data: meal, error } = await supabase.functions.invoke('meal-detector', {
        body: { image_base64: base64Image }
      });

      if (error) {
        throw new Error(`Meal detection failed: ${error.message}`);
      }

      const items = meal?.items ?? [];
      console.log('[PHOTO][MEAL] items_detected=', items.length, meal?._debug || null);
      
      const duration = Date.now() - startTime;
      
      addLogEntry('RESPONSE', `Meal detection response received`, {
        itemsDetected: items.length,
        debug: meal?._debug,
        durationMs: duration
      });

      const result = meal;
      
      // 6. Process meal detection results (no health processing for meal-only mode)
      let healthReport = null;
      let score = null;
      let flagsCount = 0;

      // Skip OCR health processing - this is meal-only mode
      addLogEntry('MEAL', 'Meal detection completed - no health processing in meal-only mode');

      // 7. Record successful run
      const newRun: OCRRun = {
        id: runId,
        timestamp: new Date(),
        duration,
        status: 'SUCCESS',
        score,
        flagsCount,
        origin: pingStatus.data?.origin,
        hasAuth: true, // Supabase functions always use auth
        textPreview: `Detected ${items.length} items`,
        healthReport // null for meal-only mode
      };

      setOcrHistory(prev => [newRun, ...prev.slice(0, 19)]); // Keep last 20
      
      addLogEntry('END', `E2E meal check completed successfully`, {
        runId,
        totalDurationMs: duration,
        itemsDetected: items.length,
        mealDebug: meal?._debug
      });

      toast({ 
        title: "E2E Meal Check Complete", 
        description: `Meal detection processed in ${duration}ms, found ${items.length} items` 
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        addLogEntry('END', `E2E check aborted`, { runId, durationMs: duration });
        return;
      }

      // Record failed run
      const failedRun: OCRRun = {
        id: runId,
        timestamp: new Date(),
        duration,
        status: error.message || 'ERROR',
        flagsCount: 0,
        origin: pingStatus.data?.origin,
        hasAuth: !!await getAuthHeaders(true).then(h => h.Authorization).catch(() => false)
      };

      setOcrHistory(prev => [failedRun, ...prev.slice(0, 19)]);
      
      addLogEntry('END', `E2E meal check failed`, {
        runId,
        error: error.message,
        durationMs: duration
      });

    } finally {
      setIsRunningE2E(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  const downloadLogBundle = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. network.json
      const networkData = {
        method: 'POST',
        url: '/meal-detector',
        lastRun: ocrHistory[0] ? {
          status: ocrHistory[0].status,
          durationMs: ocrHistory[0].duration,
          timestamp: ocrHistory[0].timestamp.toISOString()
        } : null
      };
      zip.file('network.json', JSON.stringify(networkData, null, 2));

      // 2. ocr_response.json (redacted/truncated)
      const ocrResponseData = {
        ok: ocrHistory[0]?.status === 'SUCCESS',
        ts: Date.now(),
        duration_ms: ocrHistory[0]?.duration || 0,
        meta: {
          bytes: 0, // Not tracked in current implementation
          mime: 'image/jpeg'
        },
        summary: {
          text_joined: ocrHistory[0]?.textPreview ? ocrHistory[0].textPreview.substring(0, 300) : '',
          words: ocrHistory[0]?.textPreview ? ocrHistory[0].textPreview.split(/\s+/).length : 0
        },
        blocks: [] // Simplified for debug bundle
      };
      zip.file('ocr_response.json', JSON.stringify(ocrResponseData, null, 2));

      // 3. report.json (health analysis result)
      const reportData = ocrHistory[0]?.healthReport ? {
        score: ocrHistory[0].score,
        flags: ocrHistory[0].healthReport.ingredientFlags?.map((flag: any) => ({
          code: flag.code,
          label: flag.label,
          severity: flag.severity
        })) || [],
        source: 'OCR',
        itemName: ocrHistory[0].healthReport.itemName,
        healthScore: ocrHistory[0].healthReport.healthScore,
        overallRating: ocrHistory[0].healthReport.overallRating
      } : {
        score: null,
        flags: [],
        source: 'OCR',
        error: 'No health report generated'
      };
      zip.file('report.json', JSON.stringify(reportData, null, 2));

      // 4. client_env.json
      const clientEnvData = {
        originEchoed: pingStatus.data?.origin || 'unknown',
        hasAuth: ocrHistory[0]?.hasAuth || false,
        hasApiKey: !!pingStatus.data?.apikey,
        timestamp: new Date().toISOString()
      };
      zip.file('client_env.json', JSON.stringify(clientEnvData, null, 2));

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-debug-bundle-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Bundle downloaded", description: "Debug bundle saved to downloads" });
    } catch (error) {
      console.error('Failed to create bundle:', error);
      toast({ title: "Bundle failed", description: "Could not create debug bundle", variant: "destructive" });
    }
  };

  const copyLogs = () => {
    const logsText = logEntries.slice(-50).map(entry => 
      `[${entry.timestamp.toLocaleTimeString()}] [OCR][E2E][${entry.level}] ${entry.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logsText).then(() => {
      toast({ title: "Logs copied", description: "Recent logs copied to clipboard" });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Could not copy logs", variant: "destructive" });
    });
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '-';
    const diff = Date.now() - date.getTime();
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff/1000)}s ago`;
    return `${Math.floor(diff/60000)}m ago`;
  };

  const ping = async (options: { withAuth?: boolean } = { withAuth: true }) => {
    try {
      const { data, error } = await supabase.functions.invoke('meal-detector', {
        body: { image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAA==' } // minimal test image
      });
      
      const url = 'meal-detector';
      log('[PING][START]', { url, withAuth: options.withAuth });

      if (error) {
        throw new Error(error.message);
      }

      log('[PING][SUCCESS]', { status: 'ok', data: !!data });
      setPingStatus({ status: 'ok', data: { status: 'ok', items: data?.items || [] }, lastPing: new Date() });
      return { ok: true, status: 'ok', data };
    } catch (error: any) {
      log('[PING][ERROR]', String(error));
      setPingStatus({ status: 'fail', data: { error: String(error) } });
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}>
      <div style={{ background: '#ffe08a', color: '#000', padding: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>DEV ONLY — E2E Photo Pipeline Testing</strong>
        <span style={{ 
          background: pingStatus.status === 'ok' ? '#4ade80' : pingStatus.status === 'fail' ? '#ef4444' : '#94a3b8',
          color: 'white',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 'bold'
        }}>
          PING: {pingStatus.status.toUpperCase()}
        </span>
      </div>

      {/* Ping Status Table */}
      {pingStatus.data && (
        <div style={{ marginBottom: 12, fontSize: 12, background: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Origin:</td>
                <td style={{ padding: '2px 8px' }}>{pingStatus.data.origin || '-'}</td>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>HasAuth:</td>
                <td style={{ padding: '2px 8px' }}>{pingStatus.data.hasAuth ? 'true' : 'false'}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>HasApiKey:</td>
                <td style={{ padding: '2px 8px' }}>{pingStatus.data.apikey ? 'true' : 'false'}</td>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Last Ping:</td>
                <td style={{ padding: '2px 8px' }}>{formatTime(pingStatus.lastPing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <video ref={videoRef} autoPlay playsInline muted
        style={{ width: 320, height: 240, background: '#000', borderRadius: 8, display: 'block' }} />

      {/* Primary E2E Button */}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <button 
          type="button" 
          onClick={runE2ETakePhotoCheck}
          disabled={!ready || isRunningE2E}
          style={{ 
            padding: '12px 24px', 
            fontSize: 16,
            fontWeight: 'bold',
            background: isRunningE2E ? '#94a3b8' : '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: ready && !isRunningE2E ? 'pointer' : 'not-allowed',
            minWidth: 200
          }}
        >
          {isRunningE2E ? '🔄 Running E2E Check...' : '🧪 E2E Take Photo Check'}
        </button>
      </div>

      {/* Health Report Card - Show OCR Analysis Results */}
      {ocrHistory.length > 0 && ocrHistory[0]?.healthReport && (
        <div style={{ marginBottom: 12, padding: 12, background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: 4 }}>
          <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Health Report Results
            <span style={{ 
              fontSize: 10, 
              padding: '2px 6px', 
              background: '#3b82f6', 
              color: 'white', 
              borderRadius: 4,
              fontWeight: 'normal'
            }}>
              source: OCR
            </span>
          </h3>
          
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <div><strong>Product:</strong> {ocrHistory[0].healthReport.itemName || 'Unknown Product'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <span><strong>Health Score:</strong> {ocrHistory[0].score ? `${ocrHistory[0].score}/100` : 'N/A'}</span>
              <span><strong>Rating:</strong> {ocrHistory[0].healthReport.overallRating || 'N/A'}</span>
            </div>
          </div>

          <div style={{ fontSize: 12 }}>
            <strong>Flags: </strong>
            {ocrHistory[0].healthReport.ingredientFlags?.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                {ocrHistory[0].healthReport.ingredientFlags.slice(0, 3).map((flag: any, idx: number) => (
                  <span 
                    key={idx} 
                    style={{ 
                      display: 'inline-block',
                      margin: '2px 4px 2px 0',
                      padding: '2px 6px',
                      background: flag.severity === 'high' ? '#fecaca' : flag.severity === 'medium' ? '#fed7aa' : '#fef3c7',
                      color: flag.severity === 'high' ? '#7f1d1d' : flag.severity === 'medium' ? '#9a3412' : '#92400e',
                      borderRadius: 3,
                      fontSize: 11
                    }}
                  >
                    {flag.label || flag.code}
                  </span>
                ))}
                {ocrHistory[0].healthReport.ingredientFlags.length > 3 && (
                  <span style={{ color: '#6b7280', fontSize: 11 }}>
                    +{ocrHistory[0].healthReport.ingredientFlags.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: '#059669', fontStyle: 'italic' }}>No major flags detected.</span>
            )}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => ping({ withAuth: true })} style={{ padding: '6px 12px', fontSize: 12 }}>
          Ping (Auth)
        </button>
        <button type="button" onClick={() => ping({ withAuth: false })} style={{ padding: '6px 12px', fontSize: 12 }}>
          Ping (No Auth)
        </button>
        <button 
          type="button" 
          onClick={downloadLogBundle}
          disabled={ocrHistory.length === 0}
          style={{ padding: '6px 12px', fontSize: 12, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4 }}
        >
          📦 Download Bundle
        </button>
        <button 
          type="button" 
          onClick={() => setShowLogPanel(!showLogPanel)}
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          📋 {showLogPanel ? 'Hide' : 'Show'} Log Panel
        </button>
        <button type="button" onClick={copyLogs} style={{ padding: '6px 12px', fontSize: 12 }}>
          📋 Copy Logs
        </button>
      </div>

      {/* Log Panel */}
      {showLogPanel && (
        <div style={{ marginBottom: 12, border: '1px solid #ccc', borderRadius: 4 }}>
          <div style={{ padding: 8, background: '#f5f5f5', borderBottom: '1px solid #ccc', fontSize: 12, fontWeight: 'bold' }}>
            Recent Logs (last {logEntries.length})
          </div>
          <div style={{ height: 200, overflow: 'auto', padding: 8, fontFamily: 'monospace', fontSize: 11, background: '#fafafa' }}>
            {logEntries.slice(-50).map((entry, i) => (
              <div key={i} style={{ marginBottom: 2, color: entry.level === 'ERROR' ? '#dc2626' : '#374151' }}>
                <span style={{ color: '#6b7280' }}>[{entry.timestamp.toLocaleTimeString()}]</span>
                <span style={{ fontWeight: 'bold' }}> [OCR][E2E][{entry.level}]</span> {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Table */}
      {ocrHistory.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📊 Run History (Last {ocrHistory.length})</h3>
          <div style={{ border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Time</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Duration</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Status</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Score</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ccc' }}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {ocrHistory.map((run, i) => (
                  <tr 
                    key={run.id} 
                    onClick={() => setSelectedHistoryItem(selectedHistoryItem?.id === run.id ? null : run)}
                    style={{ 
                      cursor: 'pointer', 
                      background: selectedHistoryItem?.id === run.id ? '#e0f2fe' : (i % 2 === 0 ? '#fff' : '#f9f9f9')
                    }}
                  >
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
                      {run.timestamp.toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
                      {run.duration}ms
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
                      <span style={{ 
                        color: run.status === 'SUCCESS' ? '#059669' : '#dc2626',
                        fontWeight: 'bold'
                      }}>
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
                      {run.score ? `${run.score}/10` : '-'}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>{run.flagsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected History Item Details */}
      {selectedHistoryItem && (
        <div style={{ marginBottom: 12, padding: 12, background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: 4 }}>
          <h4 style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>📋 Run Details</h4>
          <div style={{ fontSize: 12 }}>
            <div><strong>Origin:</strong> {selectedHistoryItem.origin || 'unknown'}</div>
            <div><strong>Has Auth:</strong> {selectedHistoryItem.hasAuth ? 'true' : 'false'}</div>
            <div><strong>Text Preview:</strong> {selectedHistoryItem.textPreview || 'No text detected'}</div>
          </div>
        </div>
      )}

      {/* Standard Log Output */}
      <div ref={logRef} style={{ marginTop: 12, height: 150, overflow: 'auto', fontFamily: 'monospace',
        fontSize: 12, padding: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
    </div>
  );
}