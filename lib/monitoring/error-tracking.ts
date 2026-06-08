// Error Tracking Service - MÓDULO 34
// Monitoramento de erros (Sentry-like implementation)

export interface ErrorLog {
  id: string
  message: string
  stack?: string
  level: "info" | "warning" | "error" | "fatal"
  userId?: string
  url?: string
  userAgent?: string
  timestamp: string
  context?: Record<string, any>
}

class ErrorTrackingService {
  private errors: ErrorLog[] = []
  private maxErrors = 100

  logError(error: Error, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      message: error.message,
      stack: error.stack,
      level: "error",
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
      context,
    }

    this.errors.unshift(errorLog)
    if (this.errors.length > this.maxErrors) {
      this.errors.pop()
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorTracking]", errorLog)
    }

    // Send to monitoring service (placeholder)
    this.sendToMonitoring(errorLog)
  }

  logWarning(message: string, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      message,
      level: "warning",
      url: typeof window !== "undefined" ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      context,
    }

    this.errors.unshift(errorLog)
    if (this.errors.length > this.maxErrors) {
      this.errors.pop()
    }

    if (process.env.NODE_ENV === "development") {
      console.warn("[ErrorTracking]", errorLog)
    }
  }

  logInfo(message: string, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      message,
      level: "info",
      url: typeof window !== "undefined" ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      context,
    }

    this.errors.unshift(errorLog)
    if (this.errors.length > this.maxErrors) {
      this.errors.pop()
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[ErrorTracking]", errorLog)
    }
  }

  getErrors(): ErrorLog[] {
    return [...this.errors]
  }

  clearErrors() {
    this.errors = []
  }

  private async sendToMonitoring(errorLog: ErrorLog) {
    // Placeholder for sending to external monitoring service (Sentry, etc.)
    // In production, this would send to a monitoring service
    console.log("[Monitoring] Sending error to service:", errorLog)
  }
}

export const errorTrackingService = new ErrorTrackingService()

// Global error handler
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    errorTrackingService.logError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    errorTrackingService.logError(new Error(event.reason), {
      type: "unhandledrejection",
    })
  })
}
