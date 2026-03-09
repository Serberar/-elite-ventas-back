/**
 * @file logger.spec.ts
 * Tests para el sistema de logging - Logger estructurado con Winston
 * Cubre diferentes niveles, formateo, transports, configuración por entorno
 */

import winston from 'winston';
// import path from 'path'; // Kept for potential future use

// Guardar NODE_ENV original
const originalNodeEnv = process.env.NODE_ENV;

describe('Logger', () => {
  beforeEach(() => {
    // Limpiar cache del módulo logger para poder re-importarlo
    jest.resetModules();
  });

  afterAll(() => {
    // Restaurar NODE_ENV original
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Logger Configuration', () => {
    it('should create logger instance', () => {
      const logger = require('@infrastructure/observability/logger/logger').default;

      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should set debug level in development environment', () => {
      process.env.NODE_ENV = 'development';

      const logger = require('@infrastructure/observability/logger/logger').default;

      expect(logger.level).toBe('debug');
    });

    it('should set warn level in production environment', () => {
      process.env.NODE_ENV = 'production';

      const logger = require('@infrastructure/observability/logger/logger').default;

      expect(logger.level).toBe('warn');
    });

    it('should set warn level in test environment', () => {
      process.env.NODE_ENV = 'test';

      const logger = require('@infrastructure/observability/logger/logger').default;

      expect(logger.level).toBe('warn');
    });

    it('should set warn level in staging environment', () => {
      process.env.NODE_ENV = 'staging';

      const logger = require('@infrastructure/observability/logger/logger').default;

      expect(logger.level).toBe('warn');
    });

    it('should default to debug when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const logger = require('@infrastructure/observability/logger/logger').default;

      expect(logger.level).toBe('debug');
    });
  });

  describe('Log Levels', () => {
    let logger: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      logger = require('@infrastructure/observability/logger/logger').default;
    });

    it('should have correct log levels hierarchy', () => {
      expect(logger.levels).toEqual({
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
      });
    });

    it('should support all logging methods', () => {
      // Verificar que todos los métodos existen
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Transport Configuration', () => {
    let logger: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      logger = require('@infrastructure/observability/logger/logger').default;
    });

    it('should have transports configured', () => {
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports)).toBe(true);
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    it('should have console transport', () => {
      const consoleTransport = logger.transports.find(
        (t: any) => t instanceof winston.transports.Console
      );

      expect(consoleTransport).toBeDefined();
    });

    it('should have file transports', () => {
      const fileTransports = logger.transports.filter(
        (t: any) => t instanceof winston.transports.File
      );

      expect(fileTransports.length).toBeGreaterThanOrEqual(2); // combined.log y error.log
    });

    it('should configure combined log file', () => {
      const combinedTransport = logger.transports.find(
        (t: any) =>
          t instanceof winston.transports.File && t.filename && t.filename.includes('combined.log')
      );

      expect(combinedTransport).toBeDefined();
      expect(combinedTransport.filename).toContain('combined.log');
    });

    it('should configure error log file', () => {
      const errorTransport = logger.transports.find(
        (t: any) =>
          t instanceof winston.transports.File && t.filename && t.filename.includes('error.log')
      );

      expect(errorTransport).toBeDefined();
      expect(errorTransport.filename).toContain('error.log');
      expect(errorTransport.level).toBe('error');
    });

    it('should use paths for log files', () => {
      const fileTransports = logger.transports.filter(
        (t: any) => t instanceof winston.transports.File
      );

      fileTransports.forEach((transport: any) => {
        if (transport.filename) {
          // Verificar que tiene una ruta válida
          expect(transport.filename).toBeDefined();
          expect(typeof transport.filename).toBe('string');
          expect(transport.filename.length).toBeGreaterThan(0);

          // Verificar que es un archivo .log válido
          expect(transport.filename.endsWith('.log')).toBe(true);

          // Verificar que es combined.log o error.log
          const isValidLogFile =
            transport.filename.includes('combined.log') || transport.filename.includes('error.log');
          expect(isValidLogFile).toBe(true);
        }
      });
    });

    it('should configure file rotation settings', () => {
      const fileTransports = logger.transports.filter(
        (t: any) => t instanceof winston.transports.File
      );

      fileTransports.forEach((transport: any) => {
        expect(transport.maxsize).toBe(5242880); // 5MB
        expect(transport.maxFiles).toBe(5);
      });
    });
  });

  describe('Logger Properties', () => {
    let logger: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      logger = require('@infrastructure/observability/logger/logger').default;
    });

    it('should set exitOnError to false', () => {
      expect(logger.exitOnError).toBe(false);
    });

    it('should have proper level configuration', () => {
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });
  });

  describe('Morgan Stream Integration', () => {
    let morganStream: any;

    beforeEach(() => {
      morganStream = require('@infrastructure/observability/logger/logger').morganStream;
    });

    it('should export morganStream object', () => {
      expect(morganStream).toBeDefined();
      expect(morganStream).toHaveProperty('write');
      expect(typeof morganStream.write).toBe('function');
    });

    it('should handle write operations', () => {
      // Test que no lanza errores
      expect(() => {
        morganStream.write('Test message');
      }).not.toThrow();
    });

    it('should handle empty messages', () => {
      expect(() => {
        morganStream.write('');
      }).not.toThrow();
    });

    it('should handle messages with whitespace', () => {
      expect(() => {
        morganStream.write('  message with whitespace  \n');
      }).not.toThrow();
    });
  });

  describe('Environment Handling', () => {
    it('should handle undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;

      expect(() => {
        // Test that logger module can be imported without errors
        const logger = require('@infrastructure/observability/logger/logger').default;
        expect(logger).toBeDefined();
      }).not.toThrow();

      const logger = require('@infrastructure/observability/logger/logger').default;
      expect(logger.level).toBe('debug'); // Default para desarrollo
    });

    it('should handle custom environment values', () => {
      process.env.NODE_ENV = 'custom-env';

      const logger = require('@infrastructure/observability/logger/logger').default;
      expect(logger.level).toBe('warn'); // Non-development default
    });

    it('should handle empty NODE_ENV', () => {
      process.env.NODE_ENV = '';

      const logger = require('@infrastructure/observability/logger/logger').default;
      expect(logger.level).toBe('debug'); // Empty string es falsy, usa development default
    });
  });

  describe('Integration Tests', () => {
    let logger: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      logger = require('@infrastructure/observability/logger/logger').default;
    });

    it('should work with all log levels', () => {
      // Estos tests verifican que no se lancen errores
      expect(() => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.http('HTTP message');
        logger.debug('Debug message');
      }).not.toThrow();
    });

    it('should handle structured logging', () => {
      const metadata = {
        userId: 123,
        action: 'test',
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        logger.info('Test message with metadata', metadata);
        logger.error('Error with context', { error: 'test error', ...metadata });
      }).not.toThrow();
    });

    it('should handle null and undefined metadata', () => {
      expect(() => {
        logger.info('Message with null', null);
        logger.warn('Message with undefined', undefined);
        logger.debug('Message with no metadata');
      }).not.toThrow();
    });

    it('should handle complex object metadata', () => {
      const complexData = {
        user: { id: 1, name: 'Test User' },
        request: { method: 'POST', url: '/api/test' },
        nested: { data: [1, 2, 3], settings: { enabled: true } },
      };

      expect(() => {
        logger.info('Complex logging test', complexData);
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    let logger: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      logger = require('@infrastructure/observability/logger/logger').default;
    });

    it('should handle multiple rapid log calls', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          logger.info(`Log message ${i}`);
        }
      }).not.toThrow();
    });

    it('should handle concurrent logging', async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => {
            logger.info(`Concurrent log ${i}`, { iteration: i });
          })
        );
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Winston Configuration Verification', () => {
    it('should use winston logger instance', () => {
      const logger = require('@infrastructure/observability/logger/logger').default;

      // Verificar que es una instancia de winston Logger o derivada
      expect(['Logger', 'DerivedLogger'].includes(logger.constructor.name)).toBe(true);
      expect(logger.query).toBeDefined(); // Método específico de winston
      expect(logger.profile).toBeDefined(); // Método específico de winston
    });

    it('should have winston transport instances', () => {
      const logger = require('@infrastructure/observability/logger/logger').default;

      const hasConsoleTransport = logger.transports.some(
        (t: any) => t instanceof winston.transports.Console
      );
      const hasFileTransport = logger.transports.some(
        (t: any) => t instanceof winston.transports.File
      );

      expect(hasConsoleTransport).toBe(true);
      expect(hasFileTransport).toBe(true);
    });
  });
});
