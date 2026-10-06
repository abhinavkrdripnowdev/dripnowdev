import React, { useState, useEffect } from 'react';
import { logger, type ApiLogRecord } from '@/lib/logger';

export const ApiLogDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ApiLogRecord[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(logger.getRecentLogs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const avgLatency =
    logs.length > 0
      ? Math.round(
          logs.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) / logs.length
        )
      : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Floating Telemetry Trigger Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-full shadow-2xl hover:bg-gray-800 transition-all border border-gray-700 text-xs font-semibold"
          title="Open Datadog API Log Inspector"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                errorCount > 0 ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                errorCount > 0 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            ></span>
          </span>
          <span>Datadog API Logs</span>
          <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">
            {logs.length} calls
          </span>
          {avgLatency > 0 && (
            <span className="text-gray-400 text-[10px]">{avgLatency}ms avg</span>
          )}
        </button>
      )}

      {/* Expanded Log Drawer Modal */}
      {isOpen && (
        <div className="w-96 md:w-[480px] h-96 bg-gray-950/95 backdrop-blur-md text-gray-100 rounded-2xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="bg-purple-600/30 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wide">
                Datadog Logs
              </span>
              <h3 className="font-semibold text-sm text-gray-200">API Telemetry</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {logs.length} entries ({errorCount} errors)
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold px-1.5"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900/40 text-xs border-b border-gray-800/60">
            <div className="flex gap-1">
              {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
                    filterLevel === lvl
                      ? 'bg-purple-600 text-white font-medium'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500">
              Avg latency: {avgLatency}ms
            </span>
          </div>

          {/* Log Stream Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No API logs recorded yet. Perform actions to see live request telemetry.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    log.level === 'error'
                      ? 'bg-red-950/30 border-red-800/50 text-red-200'
                      : log.level === 'warn'
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      : 'bg-gray-900/60 border-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.method === 'GET'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                            : log.method === 'POST'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                            : log.method === 'PUT' || log.method === 'PATCH'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                            : 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                        }`}
                      >
                        {log.method}
                      </span>
                      <span className="truncate max-w-[200px] font-medium text-gray-200" title={log.url}>
                        {log.url}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      {log.status !== undefined && (
                        <span
                          className={`px-1 rounded font-bold ${
                            log.status >= 200 && log.status < 300
                              ? 'bg-emerald-900/80 text-emerald-300'
                              : 'bg-red-900/80 text-red-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      )}
                      {log.durationMs !== undefined && (
                        <span className="text-gray-400">{log.durationMs}ms</span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 break-words">
                    {log.message}
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-300">
                        Details Payload
                      </summary>
                      <pre className="mt-1 p-1.5 bg-black/40 rounded text-[10px] overflow-x-auto text-gray-400">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
