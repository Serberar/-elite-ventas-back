/**
 * Módulo de Resiliencia
 * FASE 3: Estabilidad y Resiliencia
 *
 * Exporta componentes para mejorar la resiliencia del sistema
 */

export {
  CircuitBreaker,
  CircuitBreakerFactory,
  CircuitState,
  CircuitOpenError,
  type CircuitBreakerOptions,
  type CircuitBreakerStats,
} from './CircuitBreaker';

export { DatabaseCircuitBreaker, dbCircuitBreaker } from './DatabaseCircuitBreaker';
