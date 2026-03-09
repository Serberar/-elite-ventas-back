import { Request, Response, NextFunction } from 'express';

// Mock must be before imports — jest.mock is hoisted
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((options) => {
    const middleware = jest.fn();
    (middleware as any).__options = options;
    return middleware;
  });
});

// Top-level import: rateLimit will be called during module init,
// capturing calls in the outer mock
import rateLimit from 'express-rate-limit';
import { authRateLimiter, apiRateLimiter } from '@infrastructure/express/middleware/rateLimiter';

describe('rateLimiter', () => {
  // The module loaded at import time; rateLimit was called twice:
  // calls[0] = authRateLimiterMiddleware, calls[1] = apiRateLimiter
  const rateLimitCalls = (rateLimit as jest.Mock).mock.calls;

  describe('authRateLimiter — configuración', () => {
    it('should have been created via rateLimit()', () => {
      expect(rateLimitCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should configure windowMs of 15 minutes', () => {
      const authConfig = rateLimitCalls[0][0];
      expect(authConfig.windowMs).toBe(15 * 60 * 1000);
    });

    it('should configure max 5 attempts', () => {
      const authConfig = rateLimitCalls[0][0];
      expect(authConfig.max).toBe(5);
    });

    it('should use standard headers and not legacy headers', () => {
      const authConfig = rateLimitCalls[0][0];
      expect(authConfig.standardHeaders).toBe(true);
      expect(authConfig.legacyHeaders).toBe(false);
    });

    describe('keyGenerator', () => {
      const keyGenerator = rateLimitCalls[0][0].keyGenerator;

      it('should use username as key when present in body', () => {
        const req = { body: { username: '  Admin  ' }, ip: '1.2.3.4' } as Request;
        expect(keyGenerator(req)).toBe('user:admin');
      });

      it('should lowercase and trim username', () => {
        const req = { body: { username: '  MARIA  ' }, ip: '1.2.3.4' } as Request;
        expect(keyGenerator(req)).toBe('user:maria');
      });

      it('should fall back to IP when username is absent', () => {
        const req = { body: {}, ip: '5.6.7.8' } as Request;
        expect(keyGenerator(req)).toBe('ip:5.6.7.8');
      });

      it('should fall back to IP when username is empty string', () => {
        const req = { body: { username: '' }, ip: '9.9.9.9' } as Request;
        expect(keyGenerator(req)).toBe('ip:9.9.9.9');
      });

      it('should fall back to IP when username is not a string', () => {
        const req = { body: { username: 123 }, ip: '7.7.7.7' } as unknown as Request;
        expect(keyGenerator(req)).toBe('ip:7.7.7.7');
      });
    });
  });

  describe('authRateLimiter — bypass', () => {
    it('should call next() immediately when DISABLE_AUTH_RATE_LIMIT=true', () => {
      let bypassMiddleware: any;
      jest.isolateModules(() => {
        process.env.DISABLE_AUTH_RATE_LIMIT = 'true';
        bypassMiddleware = require('@infrastructure/express/middleware/rateLimiter').authRateLimiter;
        delete process.env.DISABLE_AUTH_RATE_LIMIT;
      });

      const next = jest.fn();
      bypassMiddleware({} as Request, {} as Response, next as unknown as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should NOT call next immediately when DISABLE_AUTH_RATE_LIMIT is not set', () => {
      // authRateLimiter is the real middleware (a jest.fn stub), not a bypass
      // The real middleware requires actually being called with req/res — it won't auto-call next
      // We verify it is a jest.fn() stub (not the bypass function)
      const next = jest.fn();
      authRateLimiter({} as Request, {} as Response, next as unknown as NextFunction);
      // The stub mock is jest.fn() — it doesn't call next on its own
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('apiRateLimiter', () => {
    it('should export apiRateLimiter as a function', () => {
      expect(typeof apiRateLimiter).toBe('function');
    });

    it('should configure windowMs of 1 minute', () => {
      const apiConfig = rateLimitCalls[1][0];
      expect(apiConfig.windowMs).toBe(60 * 1000);
    });

    it('should configure max 100 requests', () => {
      const apiConfig = rateLimitCalls[1][0];
      expect(apiConfig.max).toBe(100);
    });

    it('should use standard headers and not legacy headers', () => {
      const apiConfig = rateLimitCalls[1][0];
      expect(apiConfig.standardHeaders).toBe(true);
      expect(apiConfig.legacyHeaders).toBe(false);
    });
  });
});
