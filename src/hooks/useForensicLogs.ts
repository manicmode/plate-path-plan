/**
 * Forensic Logs Hook - Captures console logs matching forensic patterns
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface ForensicLogEntry {
  timestamp: number;
  level: 'debug' | 'log' | 'warn' | 'error';
  message: string;
  args: any[];
}

const MAX_LOGS = 500;
const FORENSIC_PATTERN = /\[FORENSIC\]|\[TRIPWIRE\]|\[PORTION\]|\[WIDGET_SKIP\]/i;

let originalMethods: {
  debug: typeof console.debug;
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
} | null = null;

let logBuffer: ForensicLogEntry[] = [];
let subscribers: Set<() => void> = new Set();

function isForensicEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('forensic') === '1') return true;
  
  try {
    return localStorage.getItem('forensic') === '1';
  } catch {
    return false;
  }
}

function setForensicEnabled(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.setItem('forensic', '1');
    } else {
      localStorage.removeItem('forensic');
    }
    notifySubscribers();
  } catch (error) {
    console.warn('Failed to set forensic flag:', error);
  }
}

function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

function addLogEntry(level: ForensicLogEntry['level'], args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
  ).join(' ');
  
  if (FORENSIC_PATTERN.test(message)) {
    const entry: ForensicLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      args
    };
    
    logBuffer.push(entry);
    
    // Keep only last MAX_LOGS entries
    if (logBuffer.length > MAX_LOGS) {
      logBuffer = logBuffer.slice(-MAX_LOGS);
    }
    
    notifySubscribers();
  }
}

function initializeCapture() {
  if (originalMethods || typeof window === 'undefined') return;
  
  // Store original methods
  originalMethods = {
    debug: console.debug,
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  
  // Monkey patch console methods
  console.debug = (...args) => {
    originalMethods!.debug(...args);
    addLogEntry('debug', args);
  };
  
  console.log = (...args) => {
    originalMethods!.log(...args);
    addLogEntry('log', args);
  };
  
  console.warn = (...args) => {
    originalMethods!.warn(...args);
    addLogEntry('warn', args);
  };
  
  console.error = (...args) => {
    originalMethods!.error(...args);
    addLogEntry('error', args);
  };
}

export function useForensicLogs() {
  const [logs, setLogs] = useState<ForensicLogEntry[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [buildInfo, setBuildInfo] = useState<{ build?: string; sw?: string }>({});

  const updateCallback = useCallback(() => {
    setLogs([...logBuffer]);
    setIsEnabled(isForensicEnabled());
  }, []);

  useEffect(() => {
    const enabled = isForensicEnabled();
    setIsEnabled(enabled);
    
    if (enabled) {
      initializeCapture();
    }
    
    setLogs([...logBuffer]);
    
    // Listen for build info from forensic logs
    const buildEntry = logBuffer.find(entry => entry.message.includes('[FORENSIC][BUILD]'));
    if (buildEntry) {
      try {
        const buildMatch = buildEntry.message.match(/build:\s*["']([^"']+)["']/);
        const swMatch = buildEntry.message.match(/sw:\s*["']([^"']+)["']/);
        setBuildInfo({
          build: buildMatch?.[1],
          sw: swMatch?.[1]
        });
      } catch (error) {
        console.warn('Failed to parse build info:', error);
      }
    }
    
    subscribers.add(updateCallback);
    return () => {
      subscribers.delete(updateCallback);
    };
  }, [updateCallback]);

  const clearLogs = useCallback(() => {
    logBuffer = [];
    setLogs([]);
  }, []);

  const copyLogs = useCallback(() => {
    const text = logs.map(entry => {
      const time = new Date(entry.timestamp).toISOString();
      return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`;
    }).join('\n');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(console.error);
    }
    
    return text;
  }, [logs]);

  const shareLogs = useCallback(async () => {
    const text = copyLogs();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Forensic Logs',
          text: text
        });
        return true;
      } catch (error) {
        console.warn('Share failed:', error);
      }
    }
    
    return false;
  }, [copyLogs]);

  const toggleForensic = useCallback(() => {
    const newState = !isEnabled;
    setForensicEnabled(newState);
    
    if (newState) {
      initializeCapture();
    }
  }, [isEnabled]);

  return {
    logs,
    isEnabled,
    buildInfo,
    clearLogs,
    copyLogs,
    shareLogs,
    toggleForensic
  };
}
