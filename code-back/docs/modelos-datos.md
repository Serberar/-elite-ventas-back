# Modelos de Datos

## Visión General

El sistema utiliza **PostgreSQL** como base de datos y **Prisma** como ORM. Este documento describe todos los modelos de datos y sus relaciones.

---

## Diagrama de Entidades

```
┌──────────────┐       ┌──────────────┐
│     User     │       │    Client    │
├──────────────┤       ├──────────────┤
│ id           │       │ id           │
│ firstName    │       │ firstName    │
│ lastName     │       │ lastName     │
│ username     │       │ dni          │
│ password     │       │ email        │
│ role         │       │ birthday     │
│ lastLoginAt  │       │ phones[]     │
│ refreshToken │       │ addresses{}  │
└──────┬───────┘       │ bankAccounts │
       │               │ comments[]   │
       │               └──────┬───────┘
       │                      │
       │                      │ 1:N
       │               ┌──────┴───────┐
       │               │     Sale     │
       │               ├──────────────┤
       │  ┌────────────│ id           │
       │  │            │ clientId     │
       │  │            │ statusId     │────────┐
       │  │            │ totalAmount  │        │
       │  │            │ comercial    │        │
       │  │            │ clientSnapshot│       │
       │  │            │ addressSnapshot│      │
       │  │            └──────┬───────┘        │
       │  │                   │                │
       │  │     ┌─────────────┼─────────────┐  │
       │  │     │             │             │  │
       │  │     ▼             ▼             ▼  │
       │  │ ┌────────┐  ┌──────────┐  ┌──────────┐
       │  │ │SaleItem│  │SaleHistory│ │Recording │
       │  │ └────┬───┘  └──────────┘  └──────────┘
       │  │      │
       │  │      │ N:1
       │  │      ▼
       │  │ ┌─────────┐     ┌────────────┐
       │  │ │ Product │     │ SaleStatus │◄────┘
       │  │ └─────────┘     └────────────┘
       │  │
       │  │ ┌────────────────┐
       │  └►│ SaleAssignment │
       │    └────────────────┘
       │           ▲
       └───────────┘
```

---

## Modelo: User

Representa a los usuarios del sistema (administradores, coordinadores, verificadores, comerciales).

```prisma
model User {
  id                    String    @id @default(uuid())
  firstName             String
  lastName              String
  username              String    @unique
  password              String    // Hash bcrypt
  role                  Role      @default(administrador)
  lastLoginAt           DateTime?
  refreshToken          String?
  refreshTokenExpiresAt DateTime?

  // Relaciones
  assignments        SaleAssignment[]
  saleHistories      SaleHistory[]
  uploadedRecordings SaleRecording[]
}

enum Role {
  administrador
  verificador
  coordinador
  comercial
}
```

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| firstName | String | Nombre del usuario |
| lastName | String | Apellidos del usuario |
| username | String | Nombre de usuario (único) |
| password | String | Contraseña hasheada con bcrypt |
| role | Role | Rol del usuario en el sistema |
| lastLoginAt | DateTime? | Fecha del último login |
| refreshToken | String? | Token de refresco actual |
| refreshTokenExpiresAt | DateTime? | Expiración del refresh token |

---

## Modelo: Client

Representa a los clientes del negocio.

```prisma
model Client {
  id           String   @id @default(uuid())
  firstName    String
  lastName     String
  dni          String
  email        String
  birthday     String
  phones       String[]
  addresses    Json     // Array de direcciones
  bankAccounts String[]
  authorized   String?  // Persona autorizada
  businessName String?  // Razón social (empresas)
  comments     String[]
  createdAt    DateTime @default(now())
  lastModified DateTime @updatedAt

  sales Sale[]

  @@index([dni])
  @@index([phones(ops: ArrayOps)], type: Gin)
  @@index([createdAt])
}
```

**Estructura de `addresses` (JSON)**:
```json
[
  {
    "address": "Calle Principal 123, 28001 Madrid",
    "cupsLuz": "ES0021000000000001AA",
    "cupsGas": "ES0022000000000001BB"
  }
]
```

---

## Modelo: Product

Representa los productos o tarifas que se pueden vender.

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  sku         String?  @unique
  price       Decimal
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  saleItems SaleItem[]
}
```

---

## Modelo: Sale

Representa una venta o operación comercial.

```prisma
model Sale {
  id              String      @id @default(uuid())
  clientId        String
  client          Client      @relation(fields: [clientId], references: [id])

  statusId        String
  status          SaleStatus  @relation(fields: [statusId], references: [id])

  totalAmount     Decimal     @default(0)
  notes           Json?       // [{message, userId, role, createdAt}]
  metadata        Json?

  // Snapshots para histórico
  clientSnapshot  Json?       // Datos del cliente al momento de la venta
  addressSnapshot Json?       // Dirección seleccionada para la venta
  comercial       String?     // Nombre del comercial

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  closedAt        DateTime?

  items           SaleItem[]
  assignments     SaleAssignment[]
  histories       SaleHistory[]
  recordings      SaleRecording[]
}
```

**Campos importantes**:

- `clientSnapshot`: Almacena los datos del cliente tal como estaban al crear la venta. Permite modificar los datos específicos de esta venta sin afectar al cliente original.
- `addressSnapshot`: Almacena la dirección de suministro seleccionada para esta venta.
- `comercial`: Nombre del comercial que registró la venta.

---

## Modelo: SaleItem

Representa un producto dentro de una venta.

```prisma
model SaleItem {
  id           String   @id @default(uuid())
  saleId       String
  sale         Sale     @relation(fields: [saleId], references: [id])

  productId    String?
  product      Product? @relation(fields: [productId], references: [id])

  nameSnapshot String   // Nombre del producto al momento de la venta
  skuSnapshot  String?  // SKU al momento de la venta
  unitPrice    Decimal
  quantity     Int
  finalPrice   Decimal  // unitPrice * quantity

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Nota sobre Snapshots**: Se almacena `nameSnapshot` y `skuSnapshot` porque el producto puede cambiar de nombre o precio en el futuro, pero la venta debe mantener los datos originales.

---

## Modelo: SaleStatus

Representa los estados posibles de una venta.

```prisma
model SaleStatus {
  id          String  @id @default(uuid())
  name        String
  order       Int     // Orden de visualización
  color       String? // Color hex para UI (#FFFFFF)
  isFinal     Boolean @default(false) // Estado final (completado)
  isCancelled Boolean @default(false) // Estado de cancelación

  sales Sale[]
}
```

**Estados típicos**:
| Nombre | Order | Color | isFinal | isCancelled |
|--------|-------|-------|---------|-------------|
| Pendiente | 1 | #FFA500 | false | false |
| En Verificación | 2 | #2196F3 | false | false |
| Verificada | 3 | #4CAF50 | false | false |
| Completada | 4 | #8BC34A | true | false |
| Cancelada | 5 | #F44336 | true | true |

---

## Modelo: SaleHistory

Registra el historial de acciones sobre una venta.

```prisma
model SaleHistory {
  id        String   @id @default(uuid())
  saleId    String
  sale      Sale     @relation(fields: [saleId], references: [id])

  userId    String?
  user      User?    @relation(fields: [userId], references: [id])

  action    String   // "status_change", "item_added", "client_updated"
  payload   Json?    // Datos adicionales de la acción
  createdAt DateTime @default(now())
}
```

---

## Modelo: SaleAssignment

Registra las asignaciones de usuarios a ventas.

```prisma
model SaleAssignment {
  id        String   @id @default(uuid())
  saleId    String
  sale      Sale     @relation(fields: [saleId], references: [id])

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  role      String   // Rol del usuario al momento de la asignación
  createdAt DateTime @default(now())
}
```

---

## Modelo: SaleRecording

Almacena las grabaciones asociadas a una venta.

```prisma
model SaleRecording {
  id           String   @id @default(uuid())
  saleId       String
  sale         Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)

  filename     String   // Nombre original del archivo
  storagePath  String   // Ruta: records/{saleId}/{uuid}.ext
  mimeType     String   // audio/mpeg, audio/wav, video/mp4, etc.
  size         Int      // Tamaño en bytes

  uploadedById String?
  uploadedBy   User?    @relation(fields: [uploadedById], references: [id])

  createdAt    DateTime @default(now())
}
```

---

## Índices

El esquema incluye índices para optimizar las búsquedas más comunes:

```prisma
// En Client
@@index([dni])                              // Búsqueda por DNI
@@index([phones(ops: ArrayOps)], type: Gin) // Búsqueda por teléfono (array)
@@index([createdAt])                        // Ordenación por fecha
```

El índice GIN en `phones` permite búsquedas eficientes dentro del array de teléfonos.

---

## Migraciones

Para aplicar cambios al esquema:

```bash
# Crear nueva migración
npx prisma migrate dev --name descripcion_del_cambio

# Aplicar migraciones pendientes (producción)
npx prisma migrate deploy

# Ver estado de migraciones
npx prisma migrate status
```

---

## Cliente de Prisma

Para regenerar el cliente después de cambios:

```bash
npx prisma generate
```

---

## Seed (Datos Iniciales)

Para poblar la base de datos con datos iniciales:

```bash
npx prisma db seed
```

El archivo de seed se encuentra en `prisma/seed.ts`.
