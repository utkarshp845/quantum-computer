import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock rate limiting logic
class RateLimiter {
  private lastCallTime: number = 0;
  private callCount: number = 0;
  private windowStart: number = Date.now();
  
  private readonly MAX_CALLS_PER_MINUTE = 10;
  private readonly MIN_TIME_BETWEEN_CALLS = 2000; // 2 seconds
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  checkRateLimit(): { allowed: boolean; message?: string } {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    // Check minimum time between calls
    if (timeSinceLastCall < this.MIN_TIME_BETWEEN_CALLS) {
      const remaining = Math.ceil((this.MIN_TIME_BETWEEN_CALLS - timeSinceLastCall) / 1000);
      return { 
        allowed: false, 
        message: `Please wait ${remaining} second${remaining > 1 ? 's' : ''} before another computation.` 
      };
    }
    
    // Reset counter if window expired
    if (now - this.windowStart > this.RATE_LIMIT_WINDOW) {
      this.callCount = 0;
      this.windowStart = now;
    }
    
    // Check calls per minute
    if (this.callCount >= this.MAX_CALLS_PER_MINUTE) {
      const remaining = Math.ceil((this.RATE_LIMIT_WINDOW - (now - this.windowStart)) / 1000);
      return { 
        allowed: false, 
        message: `Rate limit reached. Please wait ${remaining} second${remaining > 1 ? 's' : ''} before trying again.` 
      };
    }
    
    return { allowed: true };
  }

  recordCall(): void {
    this.lastCallTime = Date.now();
    this.callCount += 1;
  }
}

describe('Rate Limiting', () => {
  let rateLimiter: RateLimiter;
  let mockDateNow: number;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    mockDateNow = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
  });

  it('should allow first call', () => {
    const result = rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(true);
  });

  it('should block calls within minimum time window', () => {
    rateLimiter.recordCall();
    mockDateNow += 1000; // 1 second later
    vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    
    const result = rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('wait');
  });

  it('should allow calls after minimum time window', () => {
    rateLimiter.recordCall();
    mockDateNow += 2001; // Just over 2 seconds
    vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    
    const result = rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(true);
  });

  it('should allow up to MAX_CALLS_PER_MINUTE calls', () => {
    for (let i = 0; i < 9; i++) {
      const check = rateLimiter.checkRateLimit();
      expect(check.allowed).toBe(true);
      rateLimiter.recordCall();
      mockDateNow += 3000; // 3 seconds between calls
      vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    }
    
    // 10th call should still be allowed
    const result = rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(true);
  });

  it('should block after MAX_CALLS_PER_MINUTE calls', () => {
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordCall();
      mockDateNow += 3000;
      vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    }
    
    rateLimiter.recordCall(); // 11th call
    mockDateNow += 3000;
    vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    
    const result = rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Rate limit reached');
  });

  it('should reset counter after rate limit window expires', () => {
    // Make 10 calls
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordCall();
      mockDateNow += 3000;
      vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    }
    
    // Wait for window to expire AND minimum time between calls (61 + 2 seconds)
    mockDateNow += 63001; // 61 seconds for window + 2 seconds for minimum time
    vi.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    
    // After window expires and minimum time passed, should be able to make another call
    const result = rateLimiter.checkRateLimit();
    expect(result.allowed).toBe(true);
  });
});

