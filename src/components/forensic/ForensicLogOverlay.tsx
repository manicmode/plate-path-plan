/**
 * Forensic Log Overlay - Mobile debugging interface for 30g portion investigation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Share, 
  Trash2, 
  X, 
  ChevronUp,
  Bug
} from 'lucide-react';
import { useForensicLogs } from '@/hooks/useForensicLogs';
import { toast } from 'sonner';

interface ForensicLogOverlayProps {
  autoOpen?: boolean;
}

export const ForensicLogOverlay: React.FC<ForensicLogOverlayProps> = ({ autoOpen = false }) => {
  const { logs, isEnabled, buildInfo, clearLogs, copyLogs, shareLogs, toggleForensic } = useForensicLogs();
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLogCount = useRef(logs.length);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logs.length > lastLogCount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    lastLogCount.current = logs.length;
  }, [logs.length]);

  // Auto-open on new logs when autoOpen is true
  useEffect(() => {
    if (autoOpen && logs.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [autoOpen, logs.length, isOpen]);

  const handleCopy = useCallback(async () => {
    const text = copyLogs();
    toast.success(`Copied ${logs.length} forensic logs to clipboard`);
  }, [copyLogs, logs.length]);

  const handleShare = useCallback(async () => {
    const shared = await shareLogs();
    if (!shared) {
      // Fallback to copy
      handleCopy();
    } else {
      toast.success('Forensic logs shared successfully');
    }
  }, [shareLogs, handleCopy]);

  const handleClear = useCallback(() => {
    clearLogs();
    toast.success('Forensic logs cleared');
  }, [clearLogs]);

  const handleLongPressStart = useCallback(() => {
    const timer = setTimeout(() => {
      toggleForensic();
      toast.success(`Forensic mode ${isEnabled ? 'disabled' : 'enabled'}`);
      setLongPressTimer(null);
    }, 3000);
    setLongPressTimer(timer);
  }, [toggleForensic, isEnabled]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  if (!isEnabled) return null;

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'debug': return 'text-blue-500';
      default: return 'text-foreground';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'debug': return 'outline';
      default: return 'default';
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-primary/20"
        >
          <div className="flex flex-col items-center">
            <Bug className="w-5 h-5" />
            <span className="text-xs font-bold">{logs.length}</span>
          </div>
        </button>
      )}

      {/* Overlay Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div 
              className="bg-card border-b p-4 flex items-center justify-between"
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Bug className="w-5 h-5" />
                  <h2 className="font-semibold">Forensic Logs</h2>
                  <Badge variant="outline">{logs.length}</Badge>
                </div>
                {(buildInfo.build || buildInfo.sw) && (
                  <div className="text-xs text-muted-foreground">
                    Build: {buildInfo.build?.slice(-8) || 'unknown'} | SW: {buildInfo.sw || 'none'}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Long-press header (3s) to toggle forensic mode
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Controls */}
            <div className="bg-muted/30 p-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1"
              >
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Log Stream */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-auto bg-black/5 dark:bg-white/5 p-2 font-mono text-sm"
            >
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No forensic logs captured yet.
                  <br />
                  <span className="text-xs">
                    Logs matching /FORENSIC|TRIPWIRE|PORTION|WIDGET_SKIP/ will appear here.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="flex gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0 w-20">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <Badge 
                        variant={getLevelBadge(entry.level) as any} 
                        className="shrink-0 h-4 text-xs px-1"
                      >
                        {entry.level.toUpperCase()}
                      </Badge>
                      <div className={`break-all ${getLevelColor(entry.level)}`}>
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};