"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const ip_1 = __importDefault(require("ip"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerConfig_1 = require("../express/swagger/swaggerConfig");
// Routes
const userRoutes_1 = __importDefault(require("../routes/userRoutes"));
const clientRoutes_1 = __importDefault(require("../routes/clientRoutes"));
const productRoutes_1 = __importDefault(require("../routes/productRoutes"));
const saleStatusRoutes_1 = __importDefault(require("../routes/saleStatusRoutes"));
const saleRoutes_1 = __importDefault(require("../routes/saleRoutes"));
const recordingRoutes_1 = __importDefault(require("../routes/recordingRoutes"));
// Middleware
const logger_1 = __importStar(require("../observability/logger/logger"));
const monitoringMiddleware_1 = require("../express/middleware/monitoringMiddleware");
const errorHandler_1 = require("../express/middleware/errorHandler");
const healthRoutes_1 = __importDefault(require("../routes/healthRoutes"));
const prometheusMetrics_1 = require("../observability/metrics/prometheusMetrics");
/**
 * Configuración de la aplicación Express
 */
class App {
    app;
    constructor() {
        this.app = (0, express_1.default)();
        this.configureMiddleware();
        this.configureRoutes();
        this.configureErrorHandling();
    }
    /**
     * Configuración de middlewares
     */
    configureMiddleware() {
        // Trust proxy
        this.app.set('trust proxy', true);
        const FILTER_IPS = process.env.FILTER_IPS === 'true';
        const ALLOW_ALL_CORS = process.env.ALLOW_ALL_CORS === 'true';
        // === Helmet: Headers de seguridad HTTP ===
        this.app.use((0, helmet_1.default)());
        // === Filtrado de IPs ===
        if (FILTER_IPS) {
            this.app.use(this.ipFilterMiddleware());
        }
        // === CORS (corregido completamente) ===
        this.app.use(this.corsMiddleware(ALLOW_ALL_CORS));
        // === Body parsing ===
        this.app.use(express_1.default.json());
        this.app.use((0, cookie_parser_1.default)());
        // === Logging HTTP ===
        this.app.use((0, morgan_1.default)('combined', { stream: logger_1.morganStream }));
        // === Métricas Prometheus ===
        this.app.use(prometheusMetrics_1.prometheusMiddleware);
        // === Monitorización ===
        this.app.use(monitoringMiddleware_1.monitoringMiddleware);
    }
    /**
     * Middleware de filtrado por IP
     */
    ipFilterMiddleware() {
        const allowedIps = [process.env.IP1, process.env.IP2, process.env.IP3]
            .filter((ip) => Boolean(ip))
            .map((ip) => ip.trim());
        return (req, res, next) => {
            let clientIp;
            const forwarded = req.headers['x-forwarded-for'];
            if (typeof forwarded === 'string') {
                clientIp = forwarded.split(',')[0].trim();
            }
            else if (Array.isArray(forwarded)) {
                clientIp = forwarded[0].trim();
            }
            else {
                clientIp = req.socket.remoteAddress;
            }
            clientIp = this.normalizeIp(clientIp);
            const isAllowed = (clientIp && ip_1.default.isPrivate(clientIp)) || (clientIp && allowedIps.includes(clientIp));
            if (isAllowed)
                return next();
            logger_1.default.warn(`Acceso denegado desde IP: ${clientIp}`);
            res.status(403).json({ message: 'Acceso no autorizado', ip: clientIp });
        };
    }
    /**
     * Middleware CORS corregido para preflight OPTIONS
     */
    corsMiddleware(allowAll) {
        const allowedOrigins = [process.env.CORS1, process.env.CORS2, process.env.CORS3].filter(Boolean);
        return (req, res, next) => {
            const origin = req.headers.origin;
            // Preflight: permitir SIEMPRE
            if (req.method === 'OPTIONS') {
                res.header('Access-Control-Allow-Origin', origin || '*');
                res.header('Access-Control-Allow-Credentials', 'true');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
                return res.sendStatus(200);
            }
            // Validación de origen normal
            if (allowAll || !origin || allowedOrigins.includes(origin)) {
                res.header('Access-Control-Allow-Origin', origin || '*');
                res.header('Access-Control-Allow-Credentials', 'true');
                return next();
            }
            logger_1.default.warn(`Origen CORS no permitido: ${origin}`);
            return res.status(403).json({ message: 'CORS: Origen no permitido', origin });
        };
    }
    /**
     * Normaliza IPs IPv6 a IPv4
     */
    normalizeIp(ip) {
        if (!ip)
            return;
        if (ip.startsWith('::ffff:'))
            return ip.replace('::ffff:', '');
        if (ip === '::1')
            return '127.0.0.1';
        return ip;
    }
    /**
     * Configuración de rutas
     */
    configureRoutes() {
        // === Favicon: silenciar petición automática del navegador ===
        this.app.get('/favicon.ico', (_req, res) => res.status(204).end());
        // === Swagger API Docs ===
        this.app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerConfig_1.swaggerSpec, {
            explorer: true,
            customSiteTitle: 'CRM Backend API - Docs',
        }));
        this.app.get('/api-docs.json', (_req, res) => res.json(swaggerConfig_1.swaggerSpec));
        // === API Routes ===
        this.app.use('/api/users', userRoutes_1.default);
        this.app.use('/api/clients', clientRoutes_1.default);
        this.app.use('/api/products', productRoutes_1.default);
        this.app.use('/api/sale-status', saleStatusRoutes_1.default);
        this.app.use('/api/sales', saleRoutes_1.default);
        this.app.use('/api/sales', recordingRoutes_1.default);
        // === Health checks ===
        this.app.use('/', healthRoutes_1.default);
        // === Métricas Prometheus ===
        this.app.get('/metrics', prometheusMetrics_1.metricsHandler);
        this.app.get('/api/metrics', prometheusMetrics_1.metricsHandler);
        // === Ruta 404 ===
        this.app.use((req, res) => {
            res.status(404).json({
                status: 'error',
                code: 'NOT_FOUND',
                message: 'Ruta no encontrada',
                path: req.path,
            });
        });
    }
    /**
     * Configuración de manejo de errores
     */
    configureErrorHandling() {
        this.app.use(errorHandler_1.errorHandler); // último middleware
    }
    /**
     * Obtiene la instancia de Express
     */
    getApp() {
        return this.app;
    }
}
exports.App = App;
