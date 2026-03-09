/**
 * Circuit Breaker específico para operaciones de Base de Datos
 * FASE 3: Estabilidad y Resiliencia
 *
 * Proporciona una capa de protección para todas las operaciones de Prisma,
 * evitando cascada de fallos cuando la BD tiene problemas.
 *
 * Los errores de negocio (unicidad, FK, registro no encontrado) NO cuentan
 * como fallos de infraestructura para el circuit breaker.
 */

import { CircuitBreaker, CircuitBreakerFactory, CircuitState, CircuitOpenError } from './CircuitBreaker';
import logger from '@infrastructure/observability/logger/logger';

/**
 * Resultado interno que envuelve errores de negocio para que el circuit breaker
 * los trate como operaciones exitosas (la BD respondió correctamente).
 */
type DbResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

/**
 * Wrapper del Circuit Breaker para operaciones de base de datos
 */
export class DatabaseCircuitBreaker {
  private circuitBreaker: CircuitBreaker;
  private static instance: DatabaseCircuitBreaker | null = null;

  private constructor() {
    this.circuitBreaker = CircuitBreakerFactory.forDatabase('prisma-database');
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): DatabaseCircuitBreaker {
    if (!DatabaseCircuitBreaker.instance) {
      DatabaseCircuitBreaker.instance = new DatabaseCircuitBreaker();
    }
    return DatabaseCircuitBreaker.instance;
  }

  /**
   * Ejecuta una operación de base de datos protegida por el circuit breaker.
   *
   * Los errores de negocio (unicidad, FK, registro no encontrado) NO cuentan
   * como fallos de infraestructura para el circuit breaker.
   *
   * @example
   * ```typescript
   * const user = await dbCircuitBreaker.execute(() =>
   *   prisma.user.findUnique({ where: { id } })
   * );
   * ```
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Envolvemos la operación para que los errores de negocio NO lancen,
    // sino que devuelvan un resultado envuelto. Así el circuit breaker base
    // los trata como éxito (la BD respondió, el error es de lógica de negocio).
    const wrappedOperation = async (): Promise<DbResult<T>> => {
      try {
        const value = await operation();
        return { ok: true, value };
      } catch (error) {
        if (this.isRecoverableError(error)) {
          // La BD respondió correctamente, el error es de negocio.
          // No lanzamos → el circuit breaker lo cuenta como éxito.
          return { ok: false, error };
        }
        // Error de infraestructura real → lanzamos para que el CB lo cuente
        throw error;
      }
    };

    try {
      const result = await this.circuitBreaker.execute(wrappedOperation);

      // Desenvolver el resultado
      if (result.ok) {
        return result.value;
      }

      // Re-lanzar el error de negocio original (sin afectar al circuit breaker)
      throw result.error;
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        logger.warn('Operación de BD rechazada - Circuit Breaker abierto');
      }
      throw error;
    }
  }

  /**
   * Verifica si un error es recuperable (no debe contar como fallo del circuito).
   * Un error recuperable indica que la BD respondió correctamente pero la
   * operación violó una restricción de negocio.
   */
  private isRecoverableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    // Errores de validación o lógica de negocio no son fallos de infraestructura
    const recoverablePatterns = [
      'Unique constraint',      // Violación de unicidad
      'Foreign key constraint', // Violación de FK
      'Record to update not found', // Registro no encontrado
      'Record to delete does not exist', // Registro a eliminar no existe
      'P2002',                  // Prisma: violación unicidad
      'P2003',                  // Prisma: violación FK
      'P2025',                  // Prisma: registro no encontrado
    ];

    return recoverablePatterns.some((pattern) =>
      error.message.includes(pattern)
    );
  }

  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Obtiene estadísticas del circuit breaker
   */
  getStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Verifica si el circuito está abierto
   */
  isOpen(): boolean {
    return this.circuitBreaker.getState() === CircuitState.OPEN;
  }

  /**
   * Verifica si el circuito está cerrado (funcionando normalmente)
   */
  isClosed(): boolean {
    return this.circuitBreaker.getState() === CircuitState.CLOSED;
  }

  /**
   * Reset manual del circuit breaker (para recuperación)
   */
  reset(): void {
    logger.info('Reset manual del Circuit Breaker de BD');
    this.circuitBreaker.reset();
  }

  /**
   * Abre manualmente el circuit breaker (para mantenimiento)
   */
  trip(): void {
    logger.info('Apertura manual del Circuit Breaker de BD');
    this.circuitBreaker.trip();
  }
}

/**
 * Instancia singleton exportada para uso directo
 */
export const dbCircuitBreaker = DatabaseCircuitBreaker.getInstance();
