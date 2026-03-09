"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbMetrics = exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.getDbMetrics = getDbMetrics;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../observability/logger/logger"));
const prometheusMetrics_1 = require("../observability/metrics/prometheusMetrics");
// Instancia principal
const prismaClient = new client_1.PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ],
});
exports.prisma = global.prisma ?? prismaClient;
// Métricas internas locales
exports.dbMetrics = {
    queryCount: 0,
    slowQueries: 0,
    errors: 0,
    slowQueryThreshold: 1000,
};
// Eventos
// @ts-expect-error - Prisma typing issue with events
exports.prisma.$on('query', (e) => {
    exports.dbMetrics.queryCount++;
    const op = extractOperationType(e.query);
    const model = extractModelName(e.query);
    prometheusMetrics_1.dbQueriesTotal.labels(op, model).inc();
    prometheusMetrics_1.dbQueryDuration.labels(op, model).observe(e.duration / 1000);
    if (e.duration > exports.dbMetrics.slowQueryThreshold) {
        exports.dbMetrics.slowQueries++;
        logger_1.default.warn(`Query lenta (${e.duration}ms): ${e.query.slice(0, 100)}...`);
    }
});
// @ts-expect-error - Prisma typing issue with events
exports.prisma.$on('error', (e) => {
    exports.dbMetrics.errors++;
    prometheusMetrics_1.dbErrorsTotal.labels('unknown').inc();
    logger_1.default.error(`Error DB: ${e.message}`);
});
// @ts-expect-error - Prisma typing issue with events
exports.prisma.$on('warn', (e) => {
    logger_1.default.warn(`DB Warning: ${e.message}`);
});
// Helpers
function extractOperationType(query) {
    const q = query.trim().toLowerCase();
    if (q.startsWith('select'))
        return 'SELECT';
    if (q.startsWith('insert'))
        return 'INSERT';
    if (q.startsWith('update'))
        return 'UPDATE';
    if (q.startsWith('delete'))
        return 'DELETE';
    return 'OTHER';
}
function extractModelName(query) {
    const patterns = [
        /FROM\s+"?(\w+)"?/i,
        /INTO\s+"?(\w+)"?/i,
        /UPDATE\s+"?(\w+)"?/i,
        /TABLE\s+"?(\w+)"?/i,
    ];
    for (const p of patterns) {
        const m = query.match(p);
        if (m?.[1])
            return m[1];
    }
    return 'unknown';
}
async function connectDatabase(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            await exports.prisma.$connect();
            logger_1.default.info('Conexión DB establecida');
            await exports.prisma.$queryRaw `SELECT 1`;
            prometheusMetrics_1.dbConnectionsActive.set(1);
            return;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger_1.default.error(`Error conectando DB (${i + 1}/${retries}): ${message}`);
            if (i === retries - 1)
                throw new Error('No se pudo conectar a la base de datos');
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
    prometheusMetrics_1.dbConnectionsActive.set(0);
    logger_1.default.info('DB desconectada');
}
function getDbMetrics() {
    return {
        ...exports.dbMetrics,
        slowQueryRate: exports.dbMetrics.queryCount > 0
            ? `${((exports.dbMetrics.slowQueries / exports.dbMetrics.queryCount) * 100).toFixed(2)}%`
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
    global.prisma = exports.prisma;
}
