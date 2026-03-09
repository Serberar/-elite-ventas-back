"use strict";
/**
 * Circuit Breaker específico para operaciones de Base de Datos
 * FASE 3: Estabilidad y Resiliencia
 *
 * Proporciona una capa de protección para todas las operaciones de Prisma,
 * evitando cascada de fallos cuando la BD tiene problemas.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbCircuitBreaker = exports.DatabaseCircuitBreaker = void 0;
const CircuitBreaker_1 = require("./CircuitBreaker");
const logger_1 = __importDefault(require("../observability/logger/logger"));
/**
 * Wrapper del Circuit Breaker para operaciones de base de datos
 */
class DatabaseCircuitBreaker {
    circuitBreaker;
    static instance = null;
    constructor() {
        this.circuitBreaker = CircuitBreaker_1.CircuitBreakerFactory.forDatabase('prisma-database');
    }
    /**
     * Obtiene la instancia singleton
     */
    static getInstance() {
        if (!DatabaseCircuitBreaker.instance) {
            DatabaseCircuitBreaker.instance = new DatabaseCircuitBreaker();
        }
        return DatabaseCircuitBreaker.instance;
    }
    /**
     * Ejecuta una operación de base de datos protegida por el circuit breaker
     *
     * @example
     * ```typescript
     * const user = await dbCircuitBreaker.execute(() =>
     *   prisma.user.findUnique({ where: { id } })
     * );
     * ```
     */
    async execute(operation) {
        try {
            return await this.circuitBreaker.execute(operation);
        }
        catch (error) {
            // Re-lanzar CircuitOpenError sin modificar
            if (error instanceof CircuitBreaker_1.CircuitOpenError) {
                logger_1.default.warn('Operación de BD rechazada - Circuit Breaker abierto');
                throw error;
            }
            // Para otros errores de BD, verificar si son recuperables
            if (this.isRecoverableError(error)) {
                logger_1.default.warn('Error recuperable de BD detectado', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            throw error;
        }
    }
    /**
     * Verifica si un error es recuperable (no debe contar como fallo del circuito)
     */
    isRecoverableError(error) {
        if (!(error instanceof Error))
            return false;
        // Errores de validación o lógica de negocio no son fallos de infraestructura
        const recoverablePatterns = [
            'Unique constraint', // Violación de unicidad
            'Foreign key constraint', // Violación de FK
            'Record to update not found', // Registro no encontrado
            'P2002', // Prisma: violación unicidad
            'P2003', // Prisma: violación FK
            'P2025', // Prisma: registro no encontrado
        ];
        return recoverablePatterns.some((pattern) => error.message.includes(pattern));
    }
    /**
     * Obtiene el estado actual del circuit breaker
     */
    getState() {
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
    isOpen() {
        return this.circuitBreaker.getState() === CircuitBreaker_1.CircuitState.OPEN;
    }
    /**
     * Verifica si el circuito está cerrado (funcionando normalmente)
     */
    isClosed() {
        return this.circuitBreaker.getState() === CircuitBreaker_1.CircuitState.CLOSED;
    }
    /**
     * Reset manual del circuit breaker (para recuperación)
     */
    reset() {
        logger_1.default.info('Reset manual del Circuit Breaker de BD');
        this.circuitBreaker.reset();
    }
    /**
     * Abre manualmente el circuit breaker (para mantenimiento)
     */
    trip() {
        logger_1.default.info('Apertura manual del Circuit Breaker de BD');
        this.circuitBreaker.trip();
    }
}
exports.DatabaseCircuitBreaker = DatabaseCircuitBreaker;
/**
 * Instancia singleton exportada para uso directo
 */
exports.dbCircuitBreaker = DatabaseCircuitBreaker.getInstance();
