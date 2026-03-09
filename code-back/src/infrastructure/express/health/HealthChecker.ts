import { UserPrismaRepository } from '@infrastructure/prisma/UserPrismaRepository';
import { ClientPrismaRepository } from '@infrastructure/prisma/ClientPrismaRepository';
import { SalePrismaRepository } from '@infrastructure/prisma/SalePrismaRepository';
import logger from '@infrastructure/observability/logger/logger';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  responseTime: number;
  details?: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: HealthCheckResult;
  };
  overall: {
    healthy: number;
    unhealthy: number;
    degraded: number;
    total: number;
  };
}

export class HealthChecker {
  private startTime: number;

  constructor(
    private userRepository: UserPrismaRepository,
    private clientRepository: ClientPrismaRepository,
    private saleRepository: SalePrismaRepository,
    private appVersion: string,
    private environment: string
  ) {
    this.startTime = Date.now();
  }

  async checkDatabase(): Promise<HealthCheckResult> {
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
    } catch (error) {
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

  private async testUserRepository(): Promise<void> {
    // Test simple que no modifica datos
    try {
      // Intentar obtener el primer usuario o hacer un count
      await this.userRepository.findByUsername('health-check-test-user-that-should-not-exist');
    } catch (error) {
      // Si es un error de "usuario no encontrado", está bien
      // Si es un error de conexión, se propaga
      if (
        error instanceof Error &&
        !error.message.includes('not found') &&
        !error.message.includes('No se encontró')
      ) {
        throw error;
      }
    }
  }

  private async testClientRepository(): Promise<void> {
    try {
      await this.clientRepository.getByPhoneOrDNI('health-check-test');
    } catch (error) {
      if (
        error instanceof Error &&
        !error.message.includes('not found') &&
        !error.message.includes('No se encontró')
      ) {
        throw error;
      }
    }
  }

  private async testSaleRepository(): Promise<void> {
    try {
      await this.saleRepository.findById('health-check-test-id');
    } catch (error) {
      if (
        error instanceof Error &&
        !error.message.includes('not found') &&
        !error.message.includes('No se encontró')
      ) {
        throw error;
      }
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const start = Date.now();

    logger.info('Starting health check...');

    const [database] = await Promise.allSettled([this.checkDatabase()]);

    // Extraer resultados de Promise.allSettled
    const services = {
      database:
        database.status === 'fulfilled'
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
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (overall.unhealthy > 0) {
      // Si la base de datos está mal, la app está mal
      if (services.database.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else {
        overallStatus = 'degraded';
      }
    } else if (overall.degraded > 0) {
      overallStatus = 'degraded';
    }

    const totalTime = Date.now() - start;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.appVersion,
      environment: this.environment,
      services,
      overall,
    };

    logger.info(`Health check completed in ${totalTime}ms`, {
      status: overallStatus,
      services: Object.fromEntries(
        Object.entries(services).map(([name, result]) => [name, result.status])
      ),
    });

    return healthStatus;
  }

  private createFailedResult(message: string): HealthCheckResult {
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
  async quickHealthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const start = Date.now();

    try {
      // Solo verificar base de datos (crítico)
      await this.testUserRepository();

      const responseTime = Date.now() - start;
      return {
        status: responseTime > 10000 ? 'unhealthy' : 'healthy',
        responseTime,
      };
    } catch {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
      };
    }
  }
}
