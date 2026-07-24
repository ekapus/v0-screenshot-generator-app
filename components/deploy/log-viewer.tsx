'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Log {
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'warning';
}

interface LogViewerProps {
  logs: Log[];
}

export default function LogViewer({ logs }: LogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const logText = logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
          />
          {logs.length} Log Entries
        </button>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <Card className="overflow-hidden bg-slate-950 text-slate-50 font-mono text-xs">
          <div className="max-h-96 overflow-y-auto p-4 space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-500">Waiting for logs...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`flex gap-3 py-0.5 ${getLevelColor(log.level)}`}>
                  <span className="text-slate-400 flex-shrink-0">{log.timestamp}</span>
                  <span className="font-semibold flex-shrink-0">[{log.level.toUpperCase()}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </Card>
      )}
    </div>
  );
}
