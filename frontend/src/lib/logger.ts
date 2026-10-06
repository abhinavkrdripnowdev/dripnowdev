import { datadogLogs } from '@datadog/browser-logs';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface ApiLogRecord {
  id: string;
  timestamp: string;
  level: LogLevel;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  message: string;
  details?: Record<string, unknown>;
}

class DatadogLogger {
  private isInitialized = false;
  private logsBuffer: ApiLogRecord[] = [];
  private readonly maxBufferLength = 100;

  public init() {
    if (this.isInitialized) return;

    const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
    const site = import.meta.env.VITE_DATADOG_SITE || 'datadoghq.com';
    const service = import.meta.env.VITE_DATADOG_SERVICE || 'dripnow-frontend-api';
    const env = import.meta.env.VITE_DATADOG_ENV || 'development';
    const enableLogs = import.meta.env.VITE_ENABLE_DATADOG_LOGS !== 'false';

    if (enableLogs && clientToken && clientToken !== 'pub_datadog_client_token_sample') {
      try {
        datadogLogs.init({
          clientToken,
          site,
          service,
          env,
          forwardErrorsToLogs: true,
          sessionSampleRate: 100,
        });
        this.isInitialized = true;
        console.log(`[Datadog Logger] Initialized successfully for service "${service}" (${env})`);
      } catch (err) {
        console.warn('[Datadog Logger] Initialization failed:', err);
      }
    } else {
      console.log(`[Datadog Logger] Running in Local Development / Fallback mode. Logs captured locally.`);
    }

    // Attach global unhandled error listener
    window.addEventListener('error', (event) => {
      this.logError('Unhandled Global Error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason, {
        reason: String(event.reason),
      });
    });
  }

  public setUserContext(userId: string, email?: string, role?: string) {
    if (this.isInitialized) {
      datadogLogs.setUser({
        id: userId,
        email,
        role,
      });
    }
  }

  public clearUserContext() {
    if (this.isInitialized) {
      datadogLogs.clearUser();
    }
  }

  private addToBuffer(record: ApiLogRecord) {
    this.logsBuffer.unshift(record);
    if (this.logsBuffer.length > this.maxBufferLength) {
      this.logsBuffer.pop();
    }
  }

  public getRecentLogs(): ApiLogRecord[] {
    return [...this.logsBuffer];
  }

  public logApiRequest(
    method: string,
    url: string,
    status: number,
    durationMs: number,
    details?: Record<string, unknown>
  ) {
    const isError = status >= 400;
    const level: LogLevel = isError ? (status >= 500 ? 'error' : 'warn') : 'info';
    const message = `API ${method.toUpperCase()} ${url} [${status}] - ${durationMs}ms`;

    const logRecord: ApiLogRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level,
      method: method.toUpperCase(),
      url,
      status,
      durationMs,
      message,
      details,
    };

    this.addToBuffer(logRecord);

    // Forward to Datadog Browser Logs SDK
    if (this.isInitialized) {
      const ddContext = {
        http: {
          url,
          method: method.toUpperCase(),
          status_code: status,
        },
        duration_ms: durationMs,
        ...details,
      };

      if (level === 'error') {
        datadogLogs.logger.error(message, ddContext);
      } else if (level === 'warn') {
        datadogLogs.logger.warn(message, ddContext);
      } else {
        datadogLogs.logger.info(message, ddContext);
      }
    } else {
      // Development Console output
      const style = isError
        ? 'color: #ff4d4f; font-weight: bold;'
        : 'color: #52c41a; font-weight: bold;';
      console.log(`%c[API Log] ${message}`, style, details || '');
    }
  }

  public logApiError(
    method: string,
    url: string,
    error: unknown,
    durationMs?: number,
    details?: Record<string, unknown>
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = `API ${method.toUpperCase()} ${url} FAILED - ${errorMessage}`;

    const logRecord: ApiLogRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'error',
      method: method.toUpperCase(),
      url,
      durationMs,
      message,
      details: {
        error: errorMessage,
        ...details,
      },
    };

    this.addToBuffer(logRecord);

    if (this.isInitialized) {
      datadogLogs.logger.error(message, {
        http: {
          url,
          method: method.toUpperCase(),
        },
        duration_ms: durationMs,
        error: {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        ...details,
      });
    } else {
      console.error(`[Datadog API Error] ${message}`, error);
    }
  }

  public logInfo(message: string, context?: Record<string, unknown>) {
    if (this.isInitialized) datadogLogs.logger.info(message, context);
    this.addToBuffer({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'info',
      method: 'APP',
      url: window.location.pathname,
      message,
      details: context,
    });
  }

  public logWarn(message: string, context?: Record<string, unknown>) {
    if (this.isInitialized) datadogLogs.logger.warn(message, context);
    this.addToBuffer({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'warn',
      method: 'APP',
      url: window.location.pathname,
      message,
      details: context,
    });
  }

  public logError(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (this.isInitialized) {
      datadogLogs.logger.error(message, {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        ...context,
      });
    }
    this.addToBuffer({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level: 'error',
      method: 'APP',
      url: window.location.pathname,
      message,
      details: {
        error: error instanceof Error ? error.message : error,
        ...context,
      },
    });
  }
}

export const logger = new DatadogLogger();
