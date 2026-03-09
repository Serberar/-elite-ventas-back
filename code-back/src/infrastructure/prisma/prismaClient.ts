import { PrismaClient } from '@prisma/client';
import logger from '@infrastructure/observability/logger/logger';
import {
  dbQueriesTotal,
  dbQueryDuration,
  dbErrorsTotal,
  dbConnectionsActive,
} from '@infrastructure/observability/metrics/prometheusMetrics';

// Tipos estrictos para eventos
interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

interface PrismaErrorEvent {
  timestamp: Date;
  message: string;
  target: string;
}

interface PrismaWarnEvent {
  timestamp: Date;
  message: string;
  target: string;
}

// Instancia principal
const prismaClient = new PrismaClient({
  log: [
    { emit: 'event' as const, level: 'query' as const },
    { emit: 'event' as const, level: 'error' as const },
    { emit: 'event' as const, level: 'warn' as const },
  ],
});

// Patrón Singleton para desarrollo
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.prisma ?? prismaClient;

// Métricas internas locales
export const dbMetrics = {
  queryCount: 0,
  slowQueries: 0,
  errors: 0,
  slowQueryThreshold: 1000,
};

// Eventos
// @ts-expect-error - Prisma typing issue with events
prisma.$on('query', (e: PrismaQueryEvent) => {
  dbMetrics.queryCount++;

  const op = extractOperationType(e.query);
  const model = extractModelName(e.query);

  dbQueriesTotal.labels(op, model).inc();
  dbQueryDuration.labels(op, model).observe(e.duration / 1000);

  if (e.duration > dbMetrics.slowQueryThreshold) {
    dbMetrics.slowQueries++;
    logger.warn(`Query lenta (${e.duration}ms): ${e.query.slice(0, 100)}...`);
  }
});

// @ts-expect-error - Prisma typing issue with events
prisma.$on('error', (e: PrismaErrorEvent) => {
  dbMetrics.errors++;
  dbErrorsTotal.labels('unknown').inc();
  logger.error(`Error DB: ${e.message}`);
});

// @ts-expect-error - Prisma typing issue with events
prisma.$on('warn', (e: PrismaWarnEvent) => {
  logger.warn(`DB Warning: ${e.message}`);
});

// Helpers
function extractOperationType(query: string): string {
  const q = query.trim().toLowerCase();
  if (q.startsWith('select')) return 'SELECT';
  if (q.startsWith('insert')) return 'INSERT';
  if (q.startsWith('update')) return 'UPDATE';
  if (q.startsWith('delete')) return 'DELETE';
  return 'OTHER';
}

function extractModelName(query: string): string {
  const patterns = [
    /FROM\s+"?(\w+)"?/i,
    /INTO\s+"?(\w+)"?/i,
    /UPDATE\s+"?(\w+)"?/i,
    /TABLE\s+"?(\w+)"?/i,
  ];
  for (const p of patterns) {
    const m = query.match(p);
    if (m?.[1]) return m[1];
  }
  return 'unknown';
}

export async function connectDatabase(retries = 5, delay = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('Conexión DB establecida');
      await prisma.$queryRaw`SELECT 1`;
      dbConnectionsActive.set(1);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Error conectando DB (${i + 1}/${retries}): ${message}`);
      if (i === retries - 1) throw new Error('No se pudo conectar a la base de datos');
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  dbConnectionsActive.set(0);
  logger.info('DB desconectada');
}

export function getDbMetrics() {
  return {
    ...dbMetrics,
    slowQueryRate:
      dbMetrics.queryCount > 0
        ? `${((dbMetrics.slowQueries / dbMetrics.queryCount) * 100).toFixed(2)}%`
        : '0%',
  };
}

process.on('beforeExit', () => {
  void disconnectDatabase();
});

process.on('SIGINT', () => {
  void disconnectDatabase().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void disconnectDatabase().then(() => process.exit(0));
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
