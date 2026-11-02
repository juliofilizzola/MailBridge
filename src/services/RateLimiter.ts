import { RateLimitResult, WindowState } from '@src/interface/types';

export class FixedWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly windows = new Map<string, WindowState>();

  constructor(maxRequests: number, windowSeconds: number, now: () => number = Date.now) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
    this.now = now;
  }

  public consume(key: string): RateLimitResult {
    const currentMs = this.now();
    let state = this.windows.get(key);

    if (!state || currentMs - state.windowStartMs >= this.windowMs) {
      state = { windowStartMs: currentMs, count: 0 };
      this.windows.set(key, state);
    }

    const retryAfterSeconds = Math.ceil((state.windowStartMs + this.windowMs - currentMs) / 1000);

    if (state.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    state.count += 1;
    return { allowed: true, remaining: this.maxRequests - state.count, retryAfterSeconds };
  }
}
