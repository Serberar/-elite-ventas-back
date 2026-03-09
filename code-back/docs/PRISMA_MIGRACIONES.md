# Guía: Aplicar cambios de Prisma con datos existentes

## Contexto de este proyecto

La BD de producción tiene las tablas del schema CRM más `client_temp` (usada para importaciones,
se puede eliminar si hace falta). **No hay tablas ajenas al schema**, así que se puede trabajar
con el flujo normal de Prisma migraciones.

---

## Regla general

| Entorno | Comando |
|---------|---------|
| **Desarrollo** (añadir modelos, probar cambios) | `npx prisma migrate dev --name descripcion` |
| **Producción** (aplicar migraciones ya creadas) | `npx prisma migrate deploy` |
| **Nunca usar** | `npx prisma db push` (no guarda historial) |

---

## Flujo de desarrollo normal

### 1. Modifica `prisma/schema.prisma`

Por ejemplo, añadir un modelo:

```prisma
model SignatureRequest {
  id        String   @id @default(uuid())
  saleId    String   @unique
  sale      Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)
  status    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Crea y aplica la migración en desarrollo

```bash
npx prisma migrate dev --name add_signature_request
```

Respuesta esperada:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "crm" at "localhost:5432"

Applying migration `20260223120000_add_signature_request`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260223120000_add_signature_request/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in 87ms
```

> `migrate dev` hace tres cosas a la vez: crea el archivo SQL, lo aplica y regenera el cliente.

---

## Flujo si la BD de dev tiene tablas extra (por ejemplo `client_temp`)

`prisma migrate dev` detecta tablas que no están en el schema y avisa de posible pérdida de datos.
Opciones:

**Opción A — Eliminar `client_temp` antes de migrar (recomendado si no tiene datos necesarios)**

```bash
psql -U postgres -d crm -c 'DROP TABLE IF EXISTS "client_temp";'
npx prisma migrate dev --name descripcion
```

**Opción B — Crear el archivo de migración sin aplicarlo y luego desplegarlo**

```bash
# Solo crea el archivo SQL, no lo aplica ni comprueba drift
npx prisma migrate dev --create-only --name descripcion
```

Respuesta esperada:
```
Prisma Migrate created the following migration without applying it 20260223120000_descripcion

Run npx prisma migrate deploy to apply the migration.
```

Luego aplicar:
```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Desplegar en producción

En el servidor de producción **nunca** se usa `migrate dev`. Solo:

```bash
npx prisma migrate deploy
```

Respuesta esperada:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "crm" at "localhost:5432"

1 migration found in prisma/migrations

Applying migration `20260223120000_add_signature_request`

All migrations have been successfully applied.
```

Si ya estaba aplicada:
```
Already applied: `20260223120000_add_signature_request`

No pending migrations to apply.
```

---

## Añadir una columna a tabla existente

```prisma
model Sale {
  // ...campos existentes...
  closedAt DateTime? // ← nuevo campo
}
```

```bash
npx prisma migrate dev --name add_closed_at_to_sale
```

El SQL que genera Prisma será algo así (puedes verlo en el archivo creado):
```sql
ALTER TABLE "Sale" ADD COLUMN "closedAt" TIMESTAMP(3);
```

---

## Ver qué migraciones están pendientes

```bash
npx prisma migrate status
```

Respuesta si todo está al día:
```
Database schema is up to date!
```

Respuesta si hay pendientes:
```
Following migration have not yet been applied:
- 20260223120000_add_signature_request

Run npx prisma migrate deploy to apply.
```

---

## Regenerar solo el cliente (sin cambios en BD)

Si alguien ya aplicó los cambios en la BD pero el cliente Prisma no está actualizado:

```bash
npx prisma generate
```

---

## Verificar que TypeScript compila sin errores tras el cambio

```bash
npx tsc --noEmit
```

Sin output = sin errores.

---

## Resumen rápido

```bash
# 1. Editar schema.prisma
# 2. En desarrollo:
npx prisma migrate dev --name nombre_descriptivo

# 3. En producción (solo aplicar, nunca crear):
npx prisma migrate deploy

# 4. Verificar
npx tsc --noEmit
```
