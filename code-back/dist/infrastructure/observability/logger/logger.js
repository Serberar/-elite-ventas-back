"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Definir niveles de logging personalizados
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Definir colores para cada nivel
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
// Formato para consola con colores
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => {
    const timestamp = String(info.timestamp);
    const level = String(info.level);
    const message = String(info.message);
    return `${timestamp} [${level}]: ${message}`;
}));
// Formato para archivos sin colores
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Determinar nivel de log según entorno
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'warn';
};
// Crear directorio de logs si no existe
const logsDir = path_1.default.join(process.cwd(), 'logs');
// Transports: consola y archivos rotativos
const transports = [
    // Consola con colores
    new winston_1.default.transports.Console({
        format: consoleFormat,
    }),
    // Archivo para todos los logs
    new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // Archivo solo para errores
    new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
];
// Crear logger
const logger = winston_1.default.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});
// Stream para Morgan (logs HTTP)
exports.morganStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
exports.default = logger;
