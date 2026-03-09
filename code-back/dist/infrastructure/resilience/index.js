"use strict";
/**
 * Módulo de Resiliencia
 * FASE 3: Estabilidad y Resiliencia
 *
 * Exporta componentes para mejorar la resiliencia del sistema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbCircuitBreaker = exports.DatabaseCircuitBreaker = exports.CircuitOpenError = exports.CircuitState = exports.CircuitBreakerFactory = exports.CircuitBreaker = void 0;
var CircuitBreaker_1 = require("./CircuitBreaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitBreakerFactory", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitBreakerFactory; } });
Object.defineProperty(exports, "CircuitState", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitState; } });
Object.defineProperty(exports, "CircuitOpenError", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitOpenError; } });
var DatabaseCircuitBreaker_1 = require("./DatabaseCircuitBreaker");
Object.defineProperty(exports, "DatabaseCircuitBreaker", { enumerable: true, get: function () { return DatabaseCircuitBreaker_1.DatabaseCircuitBreaker; } });
Object.defineProperty(exports, "dbCircuitBreaker", { enumerable: true, get: function () { return DatabaseCircuitBreaker_1.dbCircuitBreaker; } });
