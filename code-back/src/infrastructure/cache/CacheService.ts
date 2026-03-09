/**
 * Servicio de cache en memoria para datos estáticos o que cambian poco.
 * Soporta TTL (Time To Live) y invalidación manual.
 *
 * Datos ideales para cachear:
 * - Lista de estados de venta (cambia raramente)
 * - Lista de productos activos
 * - Lista de usuarios
 */

import logger from '@infrastructure/observability/logger/logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    this.defaultTTL = defaultTTLSeconds * 1000; // Convertir a ms

    // Limpiar entradas expiradas cada minuto
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Obtiene un valor del cache si existe y no ha expirado
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug(`Cache MISS (expired): ${key}`);
      return null;
    }

    logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Almacena un valor en el cache con TTL opcional
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });

    logger.debug(`Cache SET: ${key} (TTL: ${ttl / 1000}s)`);
  }

  /**
   * Invalida una entrada específica del cache
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      logger.debug(`Cache INVALIDATED: ${key}`);
    }
  }

  /**
   * Invalida todas las entradas que coincidan con un patrón
   */
  invalidatePattern(pattern: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`Cache INVALIDATED ${count} entries matching: ${pattern}`);
    }
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache CLEARED: ${size} entries removed`);
  }

  /**
   * Obtiene o calcula un valor (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: ${cleaned} expired entries removed`);
    }
  }

  /**
   * Estadísticas del cache
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Instancia singleton con TTL de 5 minutos por defecto
export const cacheService = new CacheService(300);

// Keys constantes para evitar typos
export const CACHE_KEYS = {
  SALE_STATUSES: 'sale_statuses:all',
  SALE_STATUS_INITIAL: 'sale_statuses:initial',
  PRODUCTS: 'products:all',
  PRODUCTS_ACTIVE: 'products:active',
  USERS: 'users:all',
  COMERCIALES: 'comerciales:all',
  ALLOWED_IPS: 'allowed_ips:all',
  ALLOWED_IPS_STRINGS: 'allowed_ips:strings',
} as const;

export default cacheService;
