/**
 * Production-grade logger for 5CSwipe
 * Automatically strips debug/info logs in production builds
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('Debug message', { data });
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 *
 * Component-specific loggers:
 *   import { createLogger } from '@/utils/logger';
 *   const logger = createLogger('ComponentName');
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerContext {
  component?: string;
  userId?: string;
  [key: string]: any;
}

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, error?: Error, ...args: any[]) => void;
  setContext: (context: LoggerContext) => void;
}

class LoggerImpl implements Logger {
  private context: LoggerContext = {};

  setContext(context: LoggerContext) {
    this.context = { ...this.context, ...context };
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const ctx = Object.keys(this.context).length > 0
      ? ` [${JSON.stringify(this.context)}]`
      : '';
    return `[${timestamp}] [${level.toUpperCase()}]${ctx} ${message}`;
  }

  debug(message: string, ...args: any[]) {
    if (__DEV__) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (__DEV__) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage('warn', message), ...args);
    // TODO: Send to monitoring service in production
  }

  error(message: string, error?: Error, ...args: any[]) {
    console.error(this.formatMessage('error', message), error, ...args);
    // TODO: Send to error monitoring service (Sentry, Bugsnag)
  }
}

// Singleton instance
export const logger = new LoggerImpl();

// Factory for component-specific loggers
export function createLogger(componentName: string): Logger {
  const componentLogger = new LoggerImpl();
  componentLogger.setContext({ component: componentName });
  return componentLogger;
}
