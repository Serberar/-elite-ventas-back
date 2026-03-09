jest.mock('@infrastructure/observability/logger/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { dbCircuitBreaker } from '@infrastructure/resilience/DatabaseCircuitBreaker';
import { CircuitState, CircuitOpenError } from '@infrastructure/resilience/CircuitBreaker';

describe('DatabaseCircuitBreaker', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    dbCircuitBreaker.reset(); // ensure CLOSED state
  });

  describe('estado inicial', () => {
    it('should start in CLOSED state', () => {
      expect(dbCircuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should report isClosed() as true initially', () => {
      expect(dbCircuitBreaker.isClosed()).toBe(true);
      expect(dbCircuitBreaker.isOpen()).toBe(false);
    });
  });

  describe('execute — operaciones exitosas', () => {
    it('should execute and return successful operation result', async () => {
      const result = await dbCircuitBreaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should keep circuit CLOSED after successful operations', async () => {
      await dbCircuitBreaker.execute(() => Promise.resolve('ok'));
      await dbCircuitBreaker.execute(() => Promise.resolve('ok'));
      expect(dbCircuitBreaker.isClosed()).toBe(true);
    });

    it('should return stats with correct state', () => {
      const stats = dbCircuitBreaker.getStats();
      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('successes');
    });
  });

  describe('execute — errores de negocio (recuperables)', () => {
    const businessErrors = [
      'Unique constraint failed',
      'Foreign key constraint failed',
      'Record to update not found',
      'Record to delete does not exist',
      'P2002 error occurred',
      'P2003 violation',
      'P2025 record not found',
    ];

    businessErrors.forEach((errorMsg) => {
      it(`should not count "${errorMsg}" as infrastructure failure`, async () => {
        const businessError = new Error(errorMsg);

        await expect(
          dbCircuitBreaker.execute(() => Promise.reject(businessError))
        ).rejects.toThrow(errorMsg);

        // Circuit should remain CLOSED — business errors don't count
        expect(dbCircuitBreaker.isClosed()).toBe(true);
        expect(dbCircuitBreaker.getStats().failures).toBe(0);
      });
    });
  });

  describe('execute — errores de infraestructura', () => {
    it('should count infrastructure error as failure', async () => {
      await expect(
        dbCircuitBreaker.execute(() => Promise.reject(new Error('Connection refused')))
      ).rejects.toThrow('Connection refused');

      expect(dbCircuitBreaker.getStats().failures).toBe(1);
    });

    it('should open circuit after 5 consecutive infrastructure failures', async () => {
      const infraError = new Error('Database connection lost');

      for (let i = 0; i < 5; i++) {
        await expect(
          dbCircuitBreaker.execute(() => Promise.reject(infraError))
        ).rejects.toThrow();
      }

      expect(dbCircuitBreaker.isOpen()).toBe(true);
      expect(dbCircuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should throw CircuitOpenError immediately when circuit is OPEN', async () => {
      // Open the circuit
      const infraError = new Error('DB down');
      for (let i = 0; i < 5; i++) {
        await expect(dbCircuitBreaker.execute(() => Promise.reject(infraError))).rejects.toThrow();
      }
      expect(dbCircuitBreaker.isOpen()).toBe(true);

      // Next call should fail immediately without calling the operation
      const operation = jest.fn();
      await expect(dbCircuitBreaker.execute(operation)).rejects.toThrow(CircuitOpenError);
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('transiciones de estado', () => {
    it('should transition to HALF_OPEN after timeout when OPEN', async () => {
      dbCircuitBreaker.trip(); // force OPEN
      expect(dbCircuitBreaker.isOpen()).toBe(true);

      // Advance past the 30-second timeout
      jest.advanceTimersByTime(31000);

      // Execute a successful operation — triggers HALF_OPEN transition
      const result = await dbCircuitBreaker.execute(() => Promise.resolve('probe'));
      expect(result).toBe('probe');

      // Should be HALF_OPEN (1 success, threshold is 3)
      expect(dbCircuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close circuit after 3 successes in HALF_OPEN', async () => {
      dbCircuitBreaker.trip();
      jest.advanceTimersByTime(31000);

      // 3 successful operations to close from HALF_OPEN
      for (let i = 0; i < 3; i++) {
        await dbCircuitBreaker.execute(() => Promise.resolve('ok'));
      }

      expect(dbCircuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(dbCircuitBreaker.isClosed()).toBe(true);
    });

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      dbCircuitBreaker.trip();
      jest.advanceTimersByTime(31000);

      // First probe triggers HALF_OPEN
      await expect(
        dbCircuitBreaker.execute(() => Promise.reject(new Error('Still failing')))
      ).rejects.toThrow('Still failing');

      // Should go back to OPEN
      expect(dbCircuitBreaker.isOpen()).toBe(true);
    });
  });

  describe('reset y trip manuales', () => {
    it('should reset circuit to CLOSED', () => {
      dbCircuitBreaker.trip();
      expect(dbCircuitBreaker.isOpen()).toBe(true);

      dbCircuitBreaker.reset();
      expect(dbCircuitBreaker.isClosed()).toBe(true);
      expect(dbCircuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should trip circuit to OPEN', () => {
      expect(dbCircuitBreaker.isClosed()).toBe(true);

      dbCircuitBreaker.trip();
      expect(dbCircuitBreaker.isOpen()).toBe(true);
      expect(dbCircuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('getStats', () => {
    it('should return complete stats object', () => {
      const stats = dbCircuitBreaker.getStats();

      expect(stats).toEqual(
        expect.objectContaining({
          state: expect.any(String),
          failures: expect.any(Number),
          successes: expect.any(Number),
          totalRequests: expect.any(Number),
          totalFailures: expect.any(Number),
          totalSuccesses: expect.any(Number),
        })
      );
    });
  });
});
