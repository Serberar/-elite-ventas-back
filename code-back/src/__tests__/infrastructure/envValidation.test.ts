/**
 * Tests unitarios para validación de variables de entorno
 */

import { z } from 'zod';

// Recreamos el esquema aquí para testing independiente
const envSchemaForTest = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FILTER_IPS: z.enum(['true', 'false']).default('false'),
  ALLOW_ALL_CORS: z.enum(['true', 'false']).default('true'),
});

describe('Environment Validation Schema', () => {
  describe('Required Fields', () => {
    it('should fail if DATABASE_URL is missing', () => {
      const result = envSchemaForTest.safeParse({
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('DATABASE_URL'))).toBe(true);
      }
    });

    it('should fail if JWT_SECRET is missing', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(false);
    });

    it('should fail if JWT_SECRET is too short', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should use default NODE_ENV if not provided', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
      }
    });

    it('should use default PORT if not provided', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe('3000');
      }
    });

    it('should use default FILTER_IPS if not provided', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FILTER_IPS).toBe('false');
      }
    });
  });

  describe('Valid Configurations', () => {
    it('should accept valid production configuration', () => {
      const result = envSchemaForTest.safeParse({
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: 'postgresql://user:pass@prod-server:5432/db?connection_limit=10',
        JWT_SECRET: 'a'.repeat(64),
        JWT_REFRESH_SECRET: 'b'.repeat(64),
        FILTER_IPS: 'true',
        ALLOW_ALL_CORS: 'false',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.FILTER_IPS).toBe('true');
        expect(result.data.ALLOW_ALL_CORS).toBe('false');
      }
    });

    it('should accept valid test configuration', () => {
      const result = envSchemaForTest.safeParse({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost/test_db',
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_REFRESH_SECRET: 'test-refresh-that-is-at-least-32-chars',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Configurations', () => {
    it('should reject invalid NODE_ENV', () => {
      const result = envSchemaForTest.safeParse({
        NODE_ENV: 'staging',
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid FILTER_IPS value', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        FILTER_IPS: 'yes',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty DATABASE_URL', () => {
      const result = envSchemaForTest.safeParse({
        DATABASE_URL: '',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });

      expect(result.success).toBe(false);
    });
  });
});
