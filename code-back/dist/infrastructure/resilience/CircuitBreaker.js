"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerFactory = exports.CircuitBreaker = exports.CircuitOpenError = exports.CircuitState = void 0;
const logger_1 = __importDefault(require("../observability/logger/logger"));
/**
 * Estados posibles del circuit breaker
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
/**
 * Error lanzado cuando el circuito está abierto
 */
class CircuitOpenError extends Error {
    constructor(circuitName) {
        super(`Circuit breaker '${circuitName}' está abierto. Servicio temporalmente no disponible.`);
        this.name = 'CircuitOpenError';
    }
}
exports.CircuitOpenError = CircuitOpenError;
/**
 * Implementación del patrón Circuit Breaker
 */
class CircuitBreaker {
    state = CircuitState.CLOSED;
    failures = 0;
    successes = 0;
    lastFailureTime = null;
    lastSuccessTime = null;
    nextAttempt = 0;
    // Estadísticas acumuladas
    totalRequests = 0;
    totalFailures = 0;
    totalSuccesses = 0;
    options;
    constructor(options) {
        this.options = {
            operationTimeout: 30000, // 30 segundos por defecto
            ...options,
        };
        logger_1.default.info(`Circuit Breaker '${this.options.name}' inicializado`, {
            failureThreshold: this.options.failureThreshold,
            successThreshold: this.options.successThreshold,
            timeout: this.options.timeout,
        });
    }
    /**
     * Ejecuta una operación protegida por el circuit breaker
     */
    async execute(operation) {
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
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    /**
     * Verifica si el circuito permite ejecutar operaciones
     */
    canExecute() {
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
    async executeWithTimeout(operation) {
        if (!this.options.operationTimeout) {
            return operation();
        }
        return Promise.race([
            operation(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Operación excedió timeout de ${this.options.operationTimeout}ms`));
                }, this.options.operationTimeout);
            }),
        ]);
    }
    /**
     * Maneja una operación exitosa
     */
    onSuccess() {
        this.lastSuccessTime = Date.now();
        this.totalSuccesses++;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.options.successThreshold) {
                this.transitionTo(CircuitState.CLOSED);
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            // Reset contador de fallos en éxito
            this.failures = 0;
        }
    }
    /**
     * Maneja una operación fallida
     */
    onFailure(error) {
        this.lastFailureTime = Date.now();
        this.totalFailures++;
        this.failures++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (this.state === CircuitState.HALF_OPEN) {
            // Un fallo en HALF_OPEN vuelve a abrir el circuito
            logger_1.default.warn(`Circuit Breaker '${this.options.name}': Fallo en HALF_OPEN, reabriendo`, {
                error: errorMessage,
            });
            this.transitionTo(CircuitState.OPEN);
        }
        else if (this.state === CircuitState.CLOSED) {
            if (this.failures >= this.options.failureThreshold) {
                logger_1.default.error(`Circuit Breaker '${this.options.name}': Umbral de fallos alcanzado, abriendo circuito`, {
                    failures: this.failures,
                    threshold: this.options.failureThreshold,
                    error: errorMessage,
                });
                this.transitionTo(CircuitState.OPEN);
            }
            else {
                logger_1.default.warn(`Circuit Breaker '${this.options.name}': Fallo ${this.failures}/${this.options.failureThreshold}`, {
                    error: errorMessage,
                });
            }
        }
    }
    /**
     * Transición a un nuevo estado
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        logger_1.default.info(`Circuit Breaker '${this.options.name}': ${oldState} -> ${newState}`);
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
    getState() {
        return this.state;
    }
    /**
     * Obtiene estadísticas del circuit breaker
     */
    getStats() {
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
    reset() {
        logger_1.default.info(`Circuit Breaker '${this.options.name}': Reset manual`);
        this.transitionTo(CircuitState.CLOSED);
    }
    /**
     * Fuerza la apertura del circuito (para mantenimiento)
     */
    trip() {
        logger_1.default.info(`Circuit Breaker '${this.options.name}': Trip manual`);
        this.transitionTo(CircuitState.OPEN);
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Factory para crear circuit breakers preconfigurados
 */
exports.CircuitBreakerFactory = {
    /**
     * Circuit breaker para operaciones de base de datos
     */
    forDatabase(name = 'database') {
        return new CircuitBreaker({
            name,
            failureThreshold: 5, // 5 fallos consecutivos
            successThreshold: 3, // 3 éxitos para recuperar
            timeout: 30000, // 30 segundos abierto
            operationTimeout: 10000, // 10 segundos por operación
        });
    },
    /**
     * Circuit breaker para APIs externas
     */
    forExternalApi(name) {
        return new CircuitBreaker({
            name,
            failureThreshold: 3, // 3 fallos consecutivos
            successThreshold: 2, // 2 éxitos para recuperar
            timeout: 60000, // 60 segundos abierto
            operationTimeout: 15000, // 15 segundos por operación
        });
    },
    /**
     * Circuit breaker personalizado
     */
    custom(options) {
        return new CircuitBreaker(options);
    },
};
