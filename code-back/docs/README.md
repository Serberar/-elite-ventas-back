# Documentación Técnica - Backend CRM

## Introducción

Este documento proporciona la documentación técnica completa del backend del sistema CRM. El backend está desarrollado siguiendo principios de Clean Architecture, proporcionando una API REST robusta y escalable.

---

## Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime de JavaScript |
| Express | 5.x | Framework web |
| TypeScript | 5.8 | Tipado estático |
| Prisma | 6.x | ORM para PostgreSQL |
| PostgreSQL | 14+ | Base de datos relacional |
| JWT | - | Autenticación |
| Zod | 4.x | Validación de esquemas |
| Winston | 3.x | Logging |
| OpenTelemetry | - | Observabilidad |
| Jest | 30.x | Testing |

---

## Requisitos del Sistema

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (opcional, para rate limiting distribuido)

---

## Instalación

```bash
# Clonar el repositorio e ir al directorio del backend
cd backend-buscador/code-back

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correctos

# Ejecutar migraciones de Prisma
npx prisma migrate dev

# Generar cliente de Prisma
npx prisma generate

# Iniciar en modo desarrollo
npm run dev
```

---

## Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `npm run dev` | Inicia el servidor en modo desarrollo con hot reload |
| `build` | `npm run build` | Compila TypeScript a JavaScript |
| `start` | `npm run start` | Inicia el servidor compilado |
| `test` | `npm run test` | Ejecuta los tests |
| `lint` | `npm run lint` | Analiza el código con ESLint |
| `lint:fix` | `npm run lint:fix` | Corrige errores de ESLint automáticamente |
| `format` | `npm run format` | Formatea el código con Prettier |
| `type-check` | `npm run type-check` | Verifica tipos sin compilar |

---

## Estructura del Proyecto

```
code-back/
├── prisma/
│   ├── schema.prisma          # Esquema de la base de datos
│   └── migrations/            # Migraciones de BD
├── src/
│   ├── domain/                # Capa de Dominio
│   │   ├── entities/          # Entidades del dominio
│   │   └── repositories/      # Interfaces de repositorios
│   ├── application/           # Capa de Aplicación
│   │   ├── use-cases/         # Casos de uso
│   │   └── shared/            # Utilidades compartidas
│   ├── infrastructure/        # Capa de Infraestructura
│   │   ├── express/           # Configuración de Express
│   │   │   ├── controllers/   # Controladores HTTP
│   │   │   ├── middleware/    # Middlewares
│   │   │   ├── routes/        # Definición de rutas
│   │   │   └── validation/    # Esquemas de validación
│   │   ├── prisma/            # Implementación de repositorios
│   │   ├── container/         # Contenedor de dependencias
│   │   ├── config/            # Configuración de la app
│   │   └── observability/     # Logger y telemetría
│   └── server.ts              # Punto de entrada
├── package.json
└── tsconfig.json
```

---

## Índice de Documentación

1. [Arquitectura del Sistema](./arquitectura.md)
   - Clean Architecture
   - Capas del sistema
   - Flujo de dependencias

2. [Referencia de la API](./api-reference.md)
   - Endpoints disponibles
   - Formatos de request/response
   - Códigos de error

3. [Modelos de Datos](./modelos-datos.md)
   - Esquema de Prisma
   - Entidades del dominio
   - Relaciones

4. [Autenticación y Autorización](./autenticacion.md)
   - Sistema JWT
   - Roles y permisos
   - Middleware de seguridad

5. [Configuración](./configuracion.md)
   - Variables de entorno
   - Opciones de configuración

6. [Despliegue](./despliegue.md)
   - Guía de producción
   - Docker (opcional)

---

## Puerto por Defecto

El servidor se ejecuta por defecto en el puerto `3000`. Puede configurarse mediante la variable de entorno `PORT`.

```
http://localhost:3000
```

---

## Health Check

Para verificar que el servidor está funcionando:

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
