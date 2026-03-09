jest.mock('@infrastructure/observability/logger/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { cacheService, CACHE_KEYS } from '@infrastructure/cache/CacheService';

describe('CacheService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    cacheService.clear();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  describe('get', () => {
    it('should return null for a key that was never set', () => {
      expect(cacheService.get('non-existent')).toBeNull();
    });

    it('should return the stored value for a valid entry', () => {
      cacheService.set('key-1', 'hello', 60);
      expect(cacheService.get('key-1')).toBe('hello');
    });

    it('should return null for an expired entry', () => {
      cacheService.set('key-ttl', 'value', 1); // 1 second TTL
      jest.advanceTimersByTime(1001); // advance 1001ms past TTL
      expect(cacheService.get('key-ttl')).toBeNull();
    });

    it('should return value that has not yet expired', () => {
      cacheService.set('key-alive', 'alive', 10); // 10 second TTL
      jest.advanceTimersByTime(9000); // advance 9s — still valid
      expect(cacheService.get<string>('key-alive')).toBe('alive');
    });

    it('should support storing objects', () => {
      const obj = { name: 'John', age: 30 };
      cacheService.set('obj-key', obj, 60);
      expect(cacheService.get('obj-key')).toEqual(obj);
    });

    it('should support storing arrays', () => {
      const arr = [1, 2, 3];
      cacheService.set('arr-key', arr, 60);
      expect(cacheService.get('arr-key')).toEqual([1, 2, 3]);
    });
  });

  describe('set', () => {
    it('should override an existing entry', () => {
      cacheService.set('key-ov', 'first', 60);
      cacheService.set('key-ov', 'second', 60);
      expect(cacheService.get('key-ov')).toBe('second');
    });

    it('should use default TTL when none provided', () => {
      cacheService.set('key-def', 'value');
      // Default TTL is 300s = 300000ms
      jest.advanceTimersByTime(299000); // still alive
      expect(cacheService.get('key-def')).toBe('value');

      jest.advanceTimersByTime(2000); // expired now
      expect(cacheService.get('key-def')).toBeNull();
    });

    it('should be reflected in stats after setting', () => {
      cacheService.set('stats-key', 'v', 60);
      const s = cacheService.stats();
      expect(s.keys).toContain('stats-key');
    });
  });

  describe('invalidate', () => {
    it('should remove a specific key', () => {
      cacheService.set('to-del', 'data', 60);
      cacheService.invalidate('to-del');
      expect(cacheService.get('to-del')).toBeNull();
    });

    it('should not affect other keys', () => {
      cacheService.set('keep', 'safe', 60);
      cacheService.set('remove', 'gone', 60);
      cacheService.invalidate('remove');
      expect(cacheService.get('keep')).toBe('safe');
    });

    it('should not throw when key does not exist', () => {
      expect(() => cacheService.invalidate('ghost')).not.toThrow();
    });
  });

  describe('invalidatePattern', () => {
    it('should remove all keys matching the pattern', () => {
      cacheService.set('users:all', ['user1'], 60);
      cacheService.set('users:active', ['user2'], 60);
      cacheService.set('products:all', ['prod1'], 60);

      cacheService.invalidatePattern('users');

      expect(cacheService.get('users:all')).toBeNull();
      expect(cacheService.get('users:active')).toBeNull();
      expect(cacheService.get('products:all')).toEqual(['prod1']);
    });

    it('should not throw when no keys match', () => {
      expect(() => cacheService.invalidatePattern('xyz-no-match')).not.toThrow();
    });

    it('should remove only matching keys', () => {
      cacheService.set('sale_statuses:all', [1], 60);
      cacheService.set('sale_statuses:initial', [2], 60);
      cacheService.set('products:all', [3], 60);

      cacheService.invalidatePattern('sale_statuses');

      expect(cacheService.get('sale_statuses:all')).toBeNull();
      expect(cacheService.get('sale_statuses:initial')).toBeNull();
      expect(cacheService.get('products:all')).toEqual([3]);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cacheService.set('a', 1, 60);
      cacheService.set('b', 2, 60);
      cacheService.set('c', 3, 60);

      cacheService.clear();

      expect(cacheService.stats().size).toBe(0);
      expect(cacheService.get('a')).toBeNull();
      expect(cacheService.get('b')).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value on cache hit', async () => {
      cacheService.set('cached-key', 'cached-value', 60);
      const factory = jest.fn().mockResolvedValue('new-value');

      const result = await cacheService.getOrSet('cached-key', factory, 60);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result on cache miss', async () => {
      const factory = jest.fn().mockResolvedValue('factory-value');

      const result = await cacheService.getOrSet('miss-key', factory, 60);

      expect(result).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cacheService.get('miss-key')).toBe('factory-value');
    });

    it('should call factory again after entry expires', async () => {
      const factory = jest.fn().mockResolvedValue('fresh-value');

      await cacheService.getOrSet('expire-key', factory, 1); // 1s TTL
      jest.advanceTimersByTime(1001); // expire it

      factory.mockResolvedValue('refreshed-value');
      const result = await cacheService.getOrSet('expire-key', factory, 1);

      expect(result).toBe('refreshed-value');
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should propagate factory errors', async () => {
      const factory = jest.fn().mockRejectedValue(new Error('factory failed'));

      await expect(cacheService.getOrSet('err-key', factory, 60)).rejects.toThrow('factory failed');
    });
  });

  describe('stats', () => {
    it('should return size 0 when cache is empty', () => {
      const s = cacheService.stats();
      expect(s.size).toBe(0);
      expect(s.keys).toEqual([]);
    });

    it('should reflect current cache entries', () => {
      cacheService.set('x', 1, 60);
      cacheService.set('y', 2, 60);

      const s = cacheService.stats();
      expect(s.size).toBe(2);
      expect(s.keys).toContain('x');
      expect(s.keys).toContain('y');
    });
  });

  describe('CACHE_KEYS constants', () => {
    it('should export expected cache key constants', () => {
      expect(CACHE_KEYS.SALE_STATUSES).toBe('sale_statuses:all');
      expect(CACHE_KEYS.PRODUCTS).toBe('products:all');
      expect(CACHE_KEYS.USERS).toBe('users:all');
      expect(CACHE_KEYS.ALLOWED_IPS).toBe('allowed_ips:all');
      expect(CACHE_KEYS.ALLOWED_IPS_STRINGS).toBe('allowed_ips:strings');
    });
  });
});
