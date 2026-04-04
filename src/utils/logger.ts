/**
 * Centralized logging service for the application
 * Provides structured logging with different levels
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  /**
   * Log debug message
   */
  debug(message: string, data?: any) {
    this.log("debug", message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any) {
    this.log("info", message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any) {
    this.log("warn", message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: any) {
    const stack = error instanceof Error ? error.stack : JSON.stringify(error);
    this.log("error", message, error, stack);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: any, stack?: string) {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      data,
      stack,
    };

    // Add to logs array
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Silent logging - no console output
  }

  /**
   * Get console style for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: "color: #64748b; font-weight: bold;",
      info: "color: #0891b2; font-weight: bold;",
      warn: "color: #f59e0b; font-weight: bold;",
      error: "color: #ef4444; font-weight: bold;",
    };
    return styles[level] || styles.info;
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON (for debugging)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
