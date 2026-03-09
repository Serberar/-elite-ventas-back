/**
 * Circuit Breaker Pattern Implementation
 * FASE 3: Estabilidad y Resiliencia
 *
 * Previene cascada de fallos cuando un servicio externo (BD, API, etc.)
 * está experimentando problemas. El circuito tiene 3 estados:
 *
 * - CLOSED: Funcionamiento normal, las peticiones pasan
 * - OPEN: El servicio está fallando, rechaza peticiones inmediatamente
 * - HALF_OPEN: Período de prueba, permite algunas peticiones para verificar recuperación
 */

import logger from '@infrastructure/observability/logger/logger';

/**
 * Estados posibles del circuit breaker
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Opciones de configuración del circuit breaker
 */
export interface CircuitBreakerOptions {
  /** Nombre del circuito (para logging) */
  name: string;
  /** Número de fallos consecutivos para abrir el circuito */
  failureThreshold: number;
  /** Número de éxitos en HALF_OPEN para cerrar el circuito */
  successThreshold: number;
  /** Tiempo en ms que el circuito permanece abierto antes de pasar a HALF_OPEN */
  timeout: number;
  /** Tiempo en ms para considerar que una operación ha fallado por timeout */
  operationTimeout?: number;
}

/**
 * Estadísticas del circuit breaker
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Error lanzado cuando el circuito está abierto
 */
export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit breaker '${circuitName}' está abierto. Servicio temporalmente no disponible.`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Implementación del patrón Circuit Breaker
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttempt: number = 0;

  // Estadísticas acumuladas
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      operationTimeout: 30000, // 30 segundos por defecto
      ...options,
    };

    logger.info(`Circuit Breaker '${this.options.name}' inicializado`, {
      failureThreshold: this.options.failureThreshold,
      successThreshold: this.options.successThreshold,
      timeout: this.options.timeout,
    });
  }

  /**
   * Ejecuta una operación protegida por el circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Verificar si podemos ejecutar la operación
    if (!this.canExecute()) {
      this.totalFailures++;
      throw new CircuitOpenError(this.options.name);
    }

    try {
      // Ejecutar con timeout opcional
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Verifica si el circuito permite ejecutar operaciones
   */
  private canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Verificar si ha pasado suficiente tiempo para intentar de nuevo
      if (Date.now() >= this.nextAttempt) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN: permitir una petición de prueba
    return true;
  }

  /**
   * Ejecuta la operación con timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.options.operationTimeout) {
      return operation();
    }

    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operación excedió timeout de ${this.options.operationTimeout}ms`));
        }, this.options.operationTimeout);
      }),
    ]);
  }

  /**
   * Maneja una operación exitosa
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;

      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset contador de fallos en éxito
      this.failures = 0;
    }
  }

  /**
   * Maneja una operación fallida
   */
  private onFailure(error: unknown): void {
    this.lastFailureTime = Date.now();
    this.totalFailures++;
    this.failures++;

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.state === CircuitState.HALF_OPEN) {
      // Un fallo en HALF_OPEN vuelve a abrir el circuito
      logger.warn(`Circuit Breaker '${this.options.name}': Fallo en HALF_OPEN, reabriendo`, {
        error: errorMessage,
      });
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.options.failureThreshold) {
        logger.error(`Circuit Breaker '${this.options.name}': Umbral de fallos alcanzado, abriendo circuito`, {
          failures: this.failures,
          threshold: this.options.failureThreshold,
          error: errorMessage,
        });
        this.transitionTo(CircuitState.OPEN);
      } else {
        logger.warn(`Circuit Breaker '${this.options.name}': Fallo ${this.failures}/${this.options.failureThreshold}`, {
          error: errorMessage,
        });
      }
    }
  }

  /**
   * Transición a un nuevo estado
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    logger.info(`Circuit Breaker '${this.options.name}': ${oldState} -> ${newState}`);

    switch (newState) {
      case CircuitState.OPEN:
        this.nextAttempt = Date.now() + this.options.timeout;
        this.successes = 0;
        break;

      case CircuitState.HALF_OPEN:
        this.successes = 0;
        this.failures = 0;
        break;

      case CircuitState.CLOSED:
        this.failures = 0;
        this.successes = 0;
        break;
    }
  }

  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Obtiene estadísticas del circuit breaker
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Fuerza el cierre del circuito (para recuperación manual)
   */
  reset(): void {
    logger.info(`Circuit Breaker '${this.options.name}': Reset manual`);
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Fuerza la apertura del circuito (para mantenimiento)
   */
  trip(): void {
    logger.info(`Circuit Breaker '${this.options.name}': Trip manual`);
    this.transitionTo(CircuitState.OPEN);
  }
}

/**
 * Factory para crear circuit breakers preconfigurados
 */
export const CircuitBreakerFactory = {
  /**
   * Circuit breaker para operaciones de base de datos
   */
  forDatabase(name: string = 'database'): CircuitBreaker {
    const operationTimeout = parseInt(process.env.DB_OPERATION_TIMEOUT ?? '30000', 10);
    return new CircuitBreaker({
      name,
      failureThreshold: 5,      // 5 fallos consecutivos
      successThreshold: 3,      // 3 éxitos para recuperar
      timeout: 30000,           // 30 segundos abierto
      operationTimeout,         // 30 segundos por operación (configurable via DB_OPERATION_TIMEOUT)
    });
  },

  /**
   * Circuit breaker para APIs externas
   */
  forExternalApi(name: string): CircuitBreaker {
    return new CircuitBreaker({
      name,
      failureThreshold: 3,      // 3 fallos consecutivos
      successThreshold: 2,      // 2 éxitos para recuperar
      timeout: 60000,           // 60 segundos abierto
      operationTimeout: 15000,  // 15 segundos por operación
    });
  },

  /**
   * Circuit breaker personalizado
   */
  custom(options: CircuitBreakerOptions): CircuitBreaker {
    return new CircuitBreaker(options);
  },
};
