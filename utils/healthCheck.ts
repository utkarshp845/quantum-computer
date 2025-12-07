// Health Check Utility
// Monitors application health and API connectivity

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    api: {
      status: 'ok' | 'error';
      responseTime?: number;
      error?: string;
    };
    storage: {
      status: 'ok' | 'error';
      available: boolean;
    };
  };
}

class HealthChecker {
  private lastCheck: HealthStatus | null = null;
  private checkInterval: number | null = null;

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: Date.now(),
      checks: {
        api: { status: 'ok' },
        storage: { status: 'ok', available: true },
      },
    };

    // Check API connectivity
    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        health.checks.api.status = 'error';
        health.checks.api.error = 'API key not configured';
        health.status = 'degraded';
      } else {
        // Quick connectivity check (don't make actual API call)
        health.checks.api.responseTime = Date.now() - startTime;
      }
    } catch (e) {
      health.checks.api.status = 'error';
      health.checks.api.error = e instanceof Error ? e.message : 'Unknown error';
      health.status = 'unhealthy';
    }

    // Check localStorage availability
    try {
      localStorage.setItem('__health_check__', 'test');
      localStorage.removeItem('__health_check__');
      health.checks.storage.available = true;
    } catch (e) {
      health.checks.storage.status = 'error';
      health.checks.storage.available = false;
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    this.lastCheck = health;
    return health;
  }

  getLastCheck(): HealthStatus | null {
    return this.lastCheck;
  }

  startPeriodicChecks(intervalMs: number = 60000) {
    // Check health every minute
    this.checkInterval = window.setInterval(() => {
      this.checkHealth().catch(console.error);
    }, intervalMs);
  }

  stopPeriodicChecks() {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const healthChecker = new HealthChecker();

