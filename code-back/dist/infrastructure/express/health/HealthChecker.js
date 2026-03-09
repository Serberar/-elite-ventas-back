"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthChecker = void 0;
const logger_1 = __importDefault(require("../../observability/logger/logger"));
class HealthChecker {
    userRepository;
    clientRepository;
    saleRepository;
    appVersion;
    environment;
    startTime;
    constructor(userRepository, clientRepository, saleRepository, appVersion, environment) {
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.saleRepository = saleRepository;
        this.appVersion = appVersion;
        this.environment = environment;
        this.startTime = Date.now();
    }
    async checkDatabase() {
        const start = Date.now();
        try {
            // Intentar una consulta simple a cada repositorio
            await Promise.all([
                this.testUserRepository(),
                this.testClientRepository(),
                this.testSaleRepository(),
            ]);
            const responseTime = Date.now() - start;
            return {
                status: responseTime > 5000 ? 'degraded' : 'healthy',
                message: responseTime > 5000 ? 'Database responding slowly' : 'Database operational',
                responseTime,
                details: {
                    repositories: ['users', 'clients', 'sales'],
                    queryTime: responseTime,
                },
            };
        }
        catch (error) {
            const responseTime = Date.now() - start;
            return {
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Database connection failed',
                responseTime,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
    async testUserRepository() {
        // Test simple que no modifica datos
        try {
            // Intentar obtener el primer usuario o hacer un count
            await this.userRepository.findByUsername('health-check-test-user-that-should-not-exist');
        }
        catch (error) {
            // Si es un error de "usuario no encontrado", está bien
            // Si es un error de conexión, se propaga
            if (error instanceof Error &&
                !error.message.includes('not found') &&
                !error.message.includes('No se encontró')) {
                throw error;
            }
        }
    }
    async testClientRepository() {
        try {
            await this.clientRepository.getByPhoneOrDNI('health-check-test');
        }
        catch (error) {
            if (error instanceof Error &&
                !error.message.includes('not found') &&
                !error.message.includes('No se encontró')) {
                throw error;
            }
        }
    }
    async testSaleRepository() {
        try {
            await this.saleRepository.findById('health-check-test-id');
        }
        catch (error) {
            if (error instanceof Error &&
                !error.message.includes('not found') &&
                !error.message.includes('No se encontró')) {
                throw error;
            }
        }
    }
    async getHealthStatus() {
        const start = Date.now();
        logger_1.default.info('Starting health check...');
        const [database] = await Promise.allSettled([this.checkDatabase()]);
        // Extraer resultados de Promise.allSettled
        const services = {
            database: database.status === 'fulfilled'
                ? database.value
                : this.createFailedResult('Database check failed'),
        };
        // Calcular estadísticas generales
        const statuses = Object.values(services).map((s) => s.status);
        const overall = {
            healthy: statuses.filter((s) => s === 'healthy').length,
            unhealthy: statuses.filter((s) => s === 'unhealthy').length,
            degraded: statuses.filter((s) => s === 'degraded').length,
            total: statuses.length,
        };
        // Determinar estado general
        let overallStatus = 'healthy';
        if (overall.unhealthy > 0) {
            // Si la base de datos está mal, la app está mal
            if (services.database.status === 'unhealthy') {
                overallStatus = 'unhealthy';
            }
            else {
                overallStatus = 'degraded';
            }
        }
        else if (overall.degraded > 0) {
            overallStatus = 'degraded';
        }
        const totalTime = Date.now() - start;
        const healthStatus = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            version: this.appVersion,
            environment: this.environment,
            services,
            overall,
        };
        logger_1.default.info(`Health check completed in ${totalTime}ms`, {
            status: overallStatus,
            services: Object.fromEntries(Object.entries(services).map(([name, result]) => [name, result.status])),
        });
        return healthStatus;
    }
    createFailedResult(message) {
        return {
            status: 'unhealthy',
            message,
            responseTime: 0,
            details: { error: 'Health check execution failed' },
        };
    }
    /**
     * Health check rápido solo para servicios críticos
     */
    async quickHealthCheck() {
        const start = Date.now();
        try {
            // Solo verificar base de datos (crítico)
            await this.testUserRepository();
            const responseTime = Date.now() - start;
            return {
                status: responseTime > 10000 ? 'unhealthy' : 'healthy',
                responseTime,
            };
        }
        catch {
            return {
                status: 'unhealthy',
                responseTime: Date.now() - start,
            };
        }
    }
}
exports.HealthChecker = HealthChecker;
