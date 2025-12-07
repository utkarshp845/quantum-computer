// Circuit Breaker Pattern
// Prevents cascading failures by stopping requests when API is down

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  private readonly failureThreshold = 5; // Open after 5 failures
  private readonly timeout = 60000; // 60 seconds before trying again
  private readonly halfOpenSuccessThreshold = 2; // Need 2 successes to close

  canMakeRequest(): boolean {
    const now = Date.now();

    // If closed, allow requests
    if (this.state.state === 'closed') {
      return true;
    }

    // If open, check if timeout has passed
    if (this.state.state === 'open') {
      if (now - this.state.lastFailureTime > this.timeout) {
        // Move to half-open state
        this.state.state = 'half-open';
        this.state.successCount = 0;
        return true; // Allow one request to test
      }
      return false; // Still in timeout
    }

    // If half-open, allow requests (but limited)
    if (this.state.state === 'half-open') {
      return true;
    }

    return false;
  }

  recordSuccess() {
    if (this.state.state === 'half-open') {
      this.state.successCount++;
      if (this.state.successCount >= this.halfOpenSuccessThreshold) {
        // Circuit is healthy again, close it
        this.state.state = 'closed';
        this.state.failures = 0;
        this.state.successCount = 0;
      }
    } else if (this.state.state === 'closed') {
      // Reset failure count on success
      this.state.failures = 0;
    }
  }

  recordFailure() {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'half-open') {
      // Failed during half-open, go back to open
      this.state.state = 'open';
      this.state.successCount = 0;
    } else if (this.state.state === 'closed' && this.state.failures >= this.failureThreshold) {
      // Too many failures, open the circuit
      this.state.state = 'open';
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset() {
    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      successCount: 0,
    };
  }
}

export const circuitBreaker = new CircuitBreaker();

