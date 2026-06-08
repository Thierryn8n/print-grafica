// Rate Limiter for MÓDULO 19
// Provides rate limiting functionality to prevent abuse

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * Check if a request should be rate limited
   */
  isRateLimited(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): boolean {
    const now = Date.now()
    const entry = this.store[identifier]

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store[identifier] = {
        count: 1,
        resetTime: now + windowMs,
      }
      return false
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return true
    }

    // Increment count
    entry.count++
    return false
  }

  /**
   * Get remaining requests for a given identifier
   */
  getRemainingRequests(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): number {
    const now = Date.now()
    const entry = this.store[identifier]

    if (!entry || now > entry.resetTime) {
      return maxRequests
    }

    return Math.max(0, maxRequests - entry.count)
  }

  /**
   * Get reset time for a given identifier
   */
  getResetTime(identifier: string): number | null {
    const entry = this.store[identifier]
    return entry ? entry.resetTime : null
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now()
    for (const key in this.store) {
      if (now > this.store[key].resetTime) {
        delete this.store[key]
      }
    }
  }

  /**
   * Reset rate limit for a given identifier
   */
  reset(identifier: string) {
    delete this.store[identifier]
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy() {
    clearInterval(this.cleanupInterval)
    this.store = {}
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

// Rate limit configurations
export const RATE_LIMITS = {
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  API: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  UPLOAD: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  GENERAL: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute
}

/**
 * Check if login attempts should be rate limited
 */
export function isLoginRateLimited(ipAddress: string): boolean {
  return rateLimiter.isRateLimited(
    `login:${ipAddress}`,
    RATE_LIMITS.LOGIN.maxRequests,
    RATE_LIMITS.LOGIN.windowMs
  )
}

/**
 * Check if API requests should be rate limited
 */
export function isApiRateLimited(userId: string): boolean {
  return rateLimiter.isRateLimited(
    `api:${userId}`,
    RATE_LIMITS.API.maxRequests,
    RATE_LIMITS.API.windowMs
  )
}

/**
 * Check if upload requests should be rate limited
 */
export function isUploadRateLimited(userId: string): boolean {
  return rateLimiter.isRateLimited(
    `upload:${userId}`,
    RATE_LIMITS.UPLOAD.maxRequests,
    RATE_LIMITS.UPLOAD.windowMs
  )
}

/**
 * Get rate limit info for response headers
 */
export function getRateLimitInfo(
  identifier: string,
  limit: number,
  windowMs: number
) {
  return {
    remaining: rateLimiter.getRemainingRequests(identifier, limit, windowMs),
    reset: rateLimiter.getResetTime(identifier),
    limit,
  }
}

export default rateLimiter
