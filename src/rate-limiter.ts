// Serialized rate limiter.
// Ensures we don't exceed API rate limits and risk blacklisting.
// Uses a promise chain so concurrent callers are properly serialized —
// each waiter schedules after the previous one, not alongside it.

export class RateLimiter {
  private tail: Promise<void> = Promise.resolve();
  private lastFireTime = 0;
  private queueLength = 0;

  constructor(
    private readonly minIntervalMs: number,
    private readonly maxQueueSize = 20,
  ) {}

  async wait(onWait?: (delayMs: number) => void | Promise<void>): Promise<void> {
    if (this.queueLength >= this.maxQueueSize) {
      throw new Error("Rate limiter queue full — too many concurrent requests. Try again shortly.");
    }

    this.queueLength++;

    // Chain: this caller waits for the previous tail to resolve,
    // then sleeps only as long as needed to respect the interval.
    const previous = this.tail;
    let resolve!: () => void;
    this.tail = new Promise<void>((r) => { resolve = r; });

    try {
      await previous;

      const now = Date.now();
      const elapsed = now - this.lastFireTime;
      const delay = this.minIntervalMs - elapsed;

      if (delay > 0) {
        if (onWait) await onWait(delay);
        await new Promise<void>((r) => setTimeout(r, delay));
      }

      this.lastFireTime = Date.now();
    } finally {
      this.queueLength--;
      resolve();
    }
  }
}

// Nominatim: hard limit of 1 request per second
export const nominatimLimiter = new RateLimiter(1000);

// data.gov.sg: no documented rate, but 429s observed. 500ms is conservative.
export const datagovLimiter = new RateLimiter(500);

// Overpass API: max 2 concurrent queries per IP, ~10k requests/day.
// 5s between requests avoids 429/504 errors from the public server.
export const overpassLimiter = new RateLimiter(5000);
