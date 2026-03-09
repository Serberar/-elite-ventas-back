# Arquitectura del Backend

## Visión General

El backend sigue los principios de **Clean Architecture** (también conocida como Arquitectura Hexagonal o Ports & Adapters). Esta arquitectura separa el código en capas con responsabilidades bien definidas, facilitando el testing, mantenimiento y evolución del sistema.

---

## Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Express   │  │   Prisma    │  │   Config    │          │
│  │ Controllers │  │ Repositories│  │  & Logger   │          │
│  │   Routes    │  │             │  │             │          │
│  │ Middleware  │  │             │  │             │          │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘          │
│         │                │                                   │
├─────────┼────────────────┼───────────────────────────────────┤
│         │    APPLICATION │                                   │
│         │  ┌─────────────┴─────────────┐                    │
│         │  │        USE CASES          │                    │
│         │  │                           │                    │
│         │  │  - CreateSaleUseCase      │                    │
│         │  │  - LoginUserUseCase       │                    │
│         │  │  - GetClientUseCase       │                    │
│         │  │  - etc...                 │                    │
│         │  └─────────────┬─────────────┘                    │
│         │                │                                   │
├─────────┼────────────────┼───────────────────────────────────┤
│         │      DOMAIN    │                                   │
│         │  ┌─────────────┴─────────────┐                    │
│         │  │        ENTITIES           │                    │
│         │  │                           │                    │
│         │  │  - User                   │                    │
│         │  │  - Client                 │                    │
│         │  │  - Sale                   │                    │
│         │  │  - Product                │                    │
│         │  │  - SaleStatus             │                    │
│         │  └───────────────────────────┘                    │
│         │                                                    │
│         │  ┌───────────────────────────┐                    │
│         │  │   REPOSITORY INTERFACES   │                    │
│         │  │                           │                    │
│         │  │  - IUserRepository        │                    │
│         │  │  - IClientRepository      │                    │
│         │  │  - ISaleRepository        │                    │
│         │  │  - IProductRepository     │                    │
│         │  └───────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Capas del Sistema

### 1. Domain (Dominio)

La capa más interna, contiene la lógica de negocio pura sin dependencias externas.

**Ubicación**: `src/domain/`

**Contenido**:
- **Entities**: Objetos de dominio que representan conceptos del negocio
- **Repository Interfaces**: Contratos que definen cómo acceder a los datos

```typescript
// Ejemplo: src/domain/entities/Sale.ts
export interface Sale {
  id: string;
  clientId: string;
  statusId: string;
  totalAmount: number;
  comercial?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// Ejemplo: src/domain/repositories/ISaleRepository.ts
export interface ISaleRepository {
  findById(id: string): Promise<Sale | null>;
  create(data: CreateSaleData): Promise<Sale>;
  update(id: string, data: UpdateSaleData): Promise<Sale>;
}
```

---

### 2. Application (Aplicación)

Contiene los casos de uso que orquestan la lógica de negocio.

**Ubicación**: `src/application/`

**Contenido**:
- **Use Cases**: Implementan operaciones específicas del sistema
- **Shared**: Utilidades compartidas (autorización, validación)

```typescript
// Ejemplo: CreateSaleWithProductsUseCase.ts
export class CreateSaleWithProductsUseCase {
  constructor(
    private saleRepository: ISaleRepository,
    private clientRepository: IClientRepository,
    private productRepository: IProductRepository
  ) {}

  async execute(input: CreateSaleInput): Promise<Sale> {
    // 1. Validar cliente
    // 2. Validar productos
    // 3. Crear venta
    // 4. Retornar resultado
  }
}
```

**Estructura de Use Cases por dominio**:
```
application/use-cases/
├── client/
│   ├── CreateClientUseCase.ts
│   ├── GetClientUseCase.ts
│   ├── UpdateClientUseCase.ts
│   └── PushDataClientUseCase.ts
├── product/
│   ├── CreateProductUseCase.ts
│   ├── ListProductsUseCase.ts
│   ├── UpdateProductUseCase.ts
│   └── ToggleProductActiveUseCase.ts
├── sale/
│   ├── CreateSaleWithProductsUseCase.ts
│   ├── ListSalesWithFiltersUseCase.ts
│   ├── ChangeSaleStatusUseCase.ts
│   ├── AddSaleItemUseCase.ts
│   ├── UpdateSaleItemUseCase.ts
│   └── RemoveSaleItemUseCase.ts
├── saleStatus/
│   ├── CreateSaleStatusUseCase.ts
│   ├── ListSaleStatusUseCase.ts
│   ├── UpdateSaleStatusUseCase.ts
│   └── ReorderSaleStatusesUseCase.ts
├── user/
│   ├── RegisterUserUseCase.ts
│   ├── LoginUserUseCase.ts
│   ├── RefreshTokenUseCase.ts
│   └── LogoutUserUseCase.ts
└── recording/
    ├── UploadRecordingUseCase.ts
    ├── ListRecordingsUseCase.ts
    └── DeleteRecordingUseCase.ts
```

---

### 3. Infrastructure (Infraestructura)

Implementaciones concretas de las interfaces definidas en el dominio.

**Ubicación**: `src/infrastructure/`

**Contenido**:
- **Express**: Servidor HTTP, controladores, rutas, middlewares
- **Prisma**: Implementación de repositorios con Prisma ORM
- **Container**: Inyección de dependencias
- **Config**: Configuración de la aplicación
- **Observability**: Logger y telemetría

---

## Contenedor de Dependencias

El sistema usa un contenedor de servicios para gestionar la inyección de dependencias.

**Ubicación**: `src/infrastructure/container/ServiceContainer.ts`

```typescript
// El contenedor instancia todos los use cases con sus dependencias
export const serviceContainer = {
  // Repositorios
  userRepository: new PrismaUserRepository(),
  clientRepository: new PrismaClientRepository(),
  saleRepository: new PrismaSaleRepository(),

  // Use Cases
  loginUserUseCase: new LoginUserUseCase(userRepository),
  createSaleWithProductsUseCase: new CreateSaleWithProductsUseCase(
    saleRepository,
    clientRepository,
    productRepository
  ),
  // ... más use cases
};
```

---

## Flujo de una Petición

```
1. Request HTTP
       │
       ▼
2. Express Router (routes/*.ts)
       │
       ▼
3. Middlewares (auth, validation, rate limiting)
       │
       ▼
4. Controller (controllers/*.ts)
       │
       ▼
5. Use Case (application/use-cases/*.ts)
       │
       ▼
6. Repository (prisma/*.ts)
       │
       ▼
7. Base de datos (PostgreSQL)
       │
       ▼
8. Response HTTP
```

**Ejemplo de flujo para crear una venta**:

```typescript
// 1. Route: saleRoutes.ts
router.post('/', authMiddleware, validateRequest(schema), SaleController.createSaleWithProducts);

// 2. Controller: SaleController.ts
static async createSaleWithProducts(req: Request, res: Response) {
  const result = await serviceContainer.createSaleWithProductsUseCase.execute(req.body);
  res.status(201).json(result);
}

// 3. Use Case: CreateSaleWithProductsUseCase.ts
async execute(input: CreateSaleInput): Promise<Sale> {
  // Lógica de negocio
  return this.saleRepository.create(saleData);
}

// 4. Repository: PrismaSaleRepository.ts
async create(data: CreateSaleData): Promise<Sale> {
  return prisma.sale.create({ data });
}
```

---

## Middlewares

El sistema utiliza varios middlewares para procesar las peticiones:

### authMiddleware
Verifica el token JWT y añade el usuario al request.

### validateRequest
Valida el body/params/query usando esquemas Zod.

### rateLimiter
Limita el número de peticiones por IP.

### csrfProtection
Protege contra ataques CSRF (cuando se usan cookies).

### errorHandler
Captura y formatea errores de forma consistente.

---

## Sistema de Permisos

Los permisos se definen por rol y use case:

```typescript
// src/application/shared/authorization/rolePermissions.ts
export const rolePermissions = {
  sale: {
    CreateSaleWithProductsUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    ListSalesWithFiltersUseCase: ['administrador', 'coordinador', 'verificador'],
    ChangeSaleStatusUseCase: ['administrador', 'coordinador', 'verificador'],
  },
  product: {
    CreateProductUseCase: ['administrador'],
    UpdateProductUseCase: ['administrador'],
    ListProductsUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
  },
  // ... más permisos
};
```

---

## Validación

Se utiliza Zod para validar los datos de entrada:

```typescript
// src/infrastructure/express/validation/saleSchemas.ts
export const createSaleWithProductsSchema = z.object({
  body: z.object({
    client: z.object({
      id: z.string().optional(),
      firstName: z.string(),
      lastName: z.string(),
      dni: z.string(),
      // ... más campos
    }),
    items: z.array(saleItemSchema),
    comercial: z.string().optional(),
  }),
});
```

---

## Beneficios de esta Arquitectura

1. **Testabilidad**: Cada capa puede testearse de forma aislada
2. **Mantenibilidad**: Cambios en una capa no afectan a otras
3. **Escalabilidad**: Fácil añadir nuevas funcionalidades
4. **Independencia de frameworks**: El dominio no depende de Express ni Prisma
5. **Claridad**: Responsabilidades bien definidas
