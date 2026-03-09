# Configuración del Backend

## Variables de Entorno

El backend requiere las siguientes variables de entorno para funcionar correctamente. Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`.

---

## Variables Obligatorias

### Base de Datos

```bash
# URL de conexión a PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_bd?schema=public"
```

**Formato de la URL**:
```
postgresql://[USUARIO]:[CONTRASEÑA]@[HOST]:[PUERTO]/[BASE_DE_DATOS]?schema=public
```

### Autenticación JWT

```bash
# Clave secreta para firmar tokens JWT
# IMPORTANTE: En producción, usa una clave larga y aleatoria
JWT_SECRET="tu_clave_secreta_muy_segura_de_al_menos_32_caracteres"
```

---

## Variables Opcionales

### Servidor

```bash
# Puerto del servidor (default: 3000)
PORT=3000

# Entorno de ejecución
NODE_ENV=development  # development | production | test
```

### Tokens JWT

```bash
# Duración del access token en segundos (default: 900 = 15 minutos)
JWT_ACCESS_EXPIRATION=900

# Duración del refresh token en segundos (default: 604800 = 7 días)
JWT_REFRESH_EXPIRATION=604800
```

### CORS

```bash
# Orígenes permitidos (separados por coma)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Habilitar credenciales en CORS
CORS_CREDENTIALS=true
```

### Autenticación por Cookies

```bash
# Habilitar autenticación mediante cookies httpOnly
USE_COOKIE_AUTH=false

# Nombre del dominio para las cookies (solo si USE_COOKIE_AUTH=true)
COOKIE_DOMAIN=localhost

# Cookies seguras (solo HTTPS, usar en producción)
COOKIE_SECURE=false
```

### Redis (Rate Limiting Distribuido)

```bash
# URL de conexión a Redis (opcional)
REDIS_URL=redis://localhost:6379

# Habilitar rate limiting con Redis
USE_REDIS_RATE_LIMIT=false
```

### Logging

```bash
# Nivel de log: error | warn | info | debug
LOG_LEVEL=info

# Formato de log: json | simple
LOG_FORMAT=simple
```

### OpenTelemetry (Observabilidad)

```bash
# Habilitar telemetría
OTEL_ENABLED=false

# Endpoint del colector OTLP
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Nombre del servicio
OTEL_SERVICE_NAME=crm-backend
```

### Almacenamiento de Archivos

```bash
# Directorio para almacenar grabaciones
STORAGE_PATH=./storage

# Tamaño máximo de archivo en bytes (default: 50MB)
MAX_FILE_SIZE=52428800
```

---

## Ejemplo de .env Completo

```bash
# ============================================
# CONFIGURACIÓN DEL BACKEND CRM
# ============================================

# --- Base de Datos ---
DATABASE_URL="postgresql://crm_user:password123@localhost:5432/crm_database?schema=public"

# --- Servidor ---
PORT=3000
NODE_ENV=development

# --- Autenticación JWT ---
JWT_SECRET="mi_super_clave_secreta_muy_larga_y_segura_123456"
JWT_ACCESS_EXPIRATION=900
JWT_REFRESH_EXPIRATION=604800

# --- CORS ---
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# --- Cookies (opcional) ---
USE_COOKIE_AUTH=false

# --- Logging ---
LOG_LEVEL=debug
LOG_FORMAT=simple

# --- Almacenamiento ---
STORAGE_PATH=./storage
MAX_FILE_SIZE=52428800
```

---

## Configuración por Entorno

### Desarrollo (NODE_ENV=development)

- Logs detallados (debug level)
- CORS permisivo
- Sin cookies seguras
- Hot reload habilitado

### Producción (NODE_ENV=production)

- Logs reducidos (info/warn)
- CORS restrictivo
- Cookies seguras (HTTPS)
- Optimizaciones de rendimiento

### Testing (NODE_ENV=test)

- Base de datos de pruebas
- Logs deshabilitados
- Rate limiting deshabilitado

---

## Configuración de PostgreSQL

### Crear Base de Datos

```sql
-- Conectar como superusuario
CREATE DATABASE crm_database;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE crm_database TO crm_user;
```

### Extensiones Requeridas

El esquema de Prisma utiliza índices GIN para búsquedas en arrays. PostgreSQL ya incluye esta funcionalidad por defecto.

---

## Configuración de Prisma

### Archivo schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Comandos Útiles

```bash
# Crear migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones
npx prisma migrate deploy

# Regenerar cliente
npx prisma generate

# Abrir Prisma Studio (GUI)
npx prisma studio

# Resetear base de datos (CUIDADO: elimina datos)
npx prisma migrate reset
```

---

## Seguridad en Producción

### Checklist

- [ ] `JWT_SECRET` es una clave larga y aleatoria
- [ ] `NODE_ENV` está configurado como `production`
- [ ] CORS solo permite los orígenes necesarios
- [ ] La base de datos tiene contraseña segura
- [ ] El servidor está detrás de un proxy reverso (nginx)
- [ ] HTTPS está habilitado
- [ ] Las variables sensibles no están en el código

### Generar JWT_SECRET Seguro

```bash
# Usando OpenSSL
openssl rand -base64 64

# Usando Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## Archivos de Configuración

### tsconfig.json

Configuración de TypeScript con path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@application/*": ["application/*"],
      "@infrastructure/*": ["infrastructure/*"]
    }
  }
}
```

### jest.config.js

Configuración de tests:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@domain/(.*)': '<rootDir>/src/domain/$1',
    '@application/(.*)': '<rootDir>/src/application/$1',
    '@infrastructure/(.*)': '<rootDir>/src/infrastructure/$1'
  }
};
```
