// Error Tracking Utility
// Tracks errors for monitoring and debugging

interface ErrorContext {
  message: string;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  apiCall?: {
    endpoint: string;
    status?: number;
    retryCount?: number;
  };
}

class ErrorTracker {
  private errors: ErrorContext[] = [];
  private maxErrors = 50; // Keep last 50 errors in memory

  logError(error: Error, context?: Partial<ErrorContext>) {
    const errorContext: ErrorContext = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context,
    };

    this.errors.push(errorContext);
    
    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error tracked:', errorContext);
    }

    // In production, you could send to an error tracking service
    // Example: Sentry, LogRocket, or custom endpoint
    if (import.meta.env.PROD) {
      this.sendToTrackingService(errorContext);
    }
  }

  private async sendToTrackingService(error: ErrorContext) {
    // Option 1: Send to custom endpoint (if you set one up)
    // Option 2: Send to Sentry (if configured)
    // Option 3: Log to CloudWatch (via API Gateway)
    
    // For now, just log to console
    // You can implement actual tracking service integration here
    try {
      // Example: Send to your monitoring endpoint
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // });
    } catch (e) {
      // Silently fail - don't break the app if tracking fails
      console.error('Failed to send error to tracking service:', e);
    }
  }

  getRecentErrors(count: number = 10): ErrorContext[] {
    return this.errors.slice(-count);
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorTracker = new ErrorTracker();

