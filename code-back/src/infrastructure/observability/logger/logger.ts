import winston from 'winston';
import path from 'path';

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

winston.addColors(colors);

// Formato para consola con colores
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const timestamp = String(info.timestamp);
    const level = String(info.level);
    const message = String(info.message);
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Formato para archivos sin colores
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determinar nivel de log según entorno
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');

// Transports: consola y archivos rotativos
const transports = [
  // Consola con colores
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Archivo para todos los logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Archivo solo para errores
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Crear logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Stream para Morgan (logs HTTP)
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
