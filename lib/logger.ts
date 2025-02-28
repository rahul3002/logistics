type LogLevel = "error" | "warn" | "info" | "debug"

interface LoggerOptions {
  level: LogLevel
  prefix?: string
}

class Logger {
  private level: LogLevel
  private prefix: string
  private levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  }

  constructor(options: LoggerOptions) {
    this.level = options.level
    this.prefix = options.prefix || ""
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] <= this.levels[this.level]
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = this.prefix ? `[${this.prefix}]` : ""
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ""

    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${metaStr}`
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta))
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta))
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta))
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta))
    }
  }
}

// Create and export a default logger instance
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || "info",
  prefix: "logistics-api",
})

