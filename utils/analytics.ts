// Analytics Utility
// Tracks user interactions and app usage

interface AnalyticsEvent {
  event: string;
  timestamp: number;
  properties?: Record<string, any>;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 100; // Keep last 100 events in memory
  private enabled = true;

  track(event: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: Date.now(),
      properties,
    };

    this.events.push(analyticsEvent);

    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('Analytics:', analyticsEvent);
    }

    // In production, send to analytics service
    if (import.meta.env.PROD) {
      this.sendToAnalyticsService(analyticsEvent);
    }
  }

  private async sendToAnalyticsService(event: AnalyticsEvent) {
    // Option 1: Google Analytics 4
    // Option 2: Custom analytics endpoint
    // Option 3: CloudWatch metrics
    
    try {
      // Example: Send to Google Analytics
      // gtag('event', event.event, event.properties);
      
      // Or send to custom endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (e) {
      // Silently fail
      console.error('Failed to send analytics event:', e);
    }
  }

  // Track common events
  trackNodeCreated(type: string) {
    this.track('node_created', { type });
  }

  trackGateApplied(gate: string) {
    this.track('gate_applied', { gate });
  }

  trackEntanglementCreated() {
    this.track('entanglement_created');
  }

  trackComputeReality(success: boolean, nodeCount: number, error?: string) {
    this.track('compute_reality', {
      success,
      nodeCount,
      error,
    });
  }

  trackApiCall(success: boolean, duration: number, retryCount: number) {
    this.track('api_call', {
      success,
      duration,
      retryCount,
    });
  }

  getRecentEvents(count: number = 20): AnalyticsEvent[] {
    return this.events.slice(-count);
  }

  clearEvents() {
    this.events = [];
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }
}

export const analytics = new Analytics();

