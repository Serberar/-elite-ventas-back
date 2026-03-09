# Sistema de Autenticación y Autorización

## Visión General

El sistema utiliza **JWT (JSON Web Tokens)** para la autenticación, con un esquema de doble token (access + refresh) que proporciona seguridad y buena experiencia de usuario.

---

## Arquitectura de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                               │
│                                                              │
│  1. Login (username + password)                              │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              POST /api/users/login                   │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  2. Recibe: accessToken (15min) + refreshToken (7 días)     │
│         │                                                    │
│         ▼                                                    │
│  3. Guarda tokens en localStorage                            │
│         │                                                    │
│         ▼                                                    │
│  4. Peticiones con: Authorization: Bearer <accessToken>     │
│         │                                                    │
│         ▼                                                    │
│  5. Si accessToken expira → POST /api/users/refresh          │
│         │                                                    │
│         ▼                                                    │
│  6. Recibe nuevo accessToken                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Tokens JWT

### Access Token

- **Duración**: 15 minutos
- **Uso**: Se envía en cada petición protegida
- **Contenido (payload)**:
  ```json
  {
    "userId": "uuid-del-usuario",
    "role": "comercial",
    "iat": 1704067200,
    "exp": 1704068100
  }
  ```

### Refresh Token

- **Duración**: 7 días
- **Uso**: Se usa para obtener nuevos access tokens
- **Almacenamiento**: En base de datos (campo `refreshToken` en User)
- **Validación**: Se verifica que coincida con el guardado en BD

---

## Flujo de Autenticación

### 1. Login

```typescript
// POST /api/users/login
{
  "username": "jgarcia",
  "password": "contraseña"
}

// Respuesta exitosa
{
  "id": "uuid",
  "username": "jgarcia",
  "firstName": "Juan",
  "lastName": "García",
  "role": "comercial",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 2. Peticiones Autenticadas

```bash
curl -X GET http://localhost:3000/api/sales \
  -H "Authorization: Bearer eyJhbGc..."
```

### 3. Refresh Token

```typescript
// POST /api/users/refresh
{
  "refreshToken": "eyJhbGc..."
}

// Respuesta
{
  "accessToken": "eyJhbGc..." // Nuevo access token
}
```

### 4. Logout

```typescript
// POST /api/users/logout
{
  "refreshToken": "eyJhbGc..."
}

// El refresh token se invalida en la base de datos
```

---

## Middleware de Autenticación

El middleware `authMiddleware` verifica cada petición protegida:

```typescript
// src/infrastructure/express/middleware/authMiddleware.ts

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Extraer token del header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verificar y decodificar token
    const payload = jwt.verify(token, JWT_SECRET);

    // 3. Añadir usuario al request
    req.user = {
      userId: payload.userId,
      role: payload.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
```

---

## Roles del Sistema

El sistema define 4 roles con diferentes niveles de acceso:

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|-----------------|
| **administrador** | Control total del sistema | Completo |
| **coordinador** | Supervisión de operaciones | Alto |
| **verificador** | Verificación de ventas | Medio |
| **comercial** | Registro de ventas | Básico |

---

## Sistema de Permisos

Los permisos se definen por rol y caso de uso en `rolePermissions.ts`:

```typescript
// src/application/shared/authorization/rolePermissions.ts

export const rolePermissions = {
  client: {
    GetClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
    CreateClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
    UpdateClientUseCase: ['administrador', 'verificador', 'coordinador'],
    PushDataClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
  },

  product: {
    ListProductsUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    GetProductUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    CreateProductUseCase: ['administrador'],
    UpdateProductUseCase: ['administrador'],
    ToggleProductActiveUseCase: ['administrador'],
  },

  sale: {
    CreateSaleWithProductsUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    ListSalesWithFiltersUseCase: ['administrador', 'coordinador', 'verificador'],
    ChangeSaleStatusUseCase: ['administrador', 'coordinador', 'verificador'],
    AddSaleItemUseCase: ['administrador', 'coordinador', 'verificador'],
    UpdateSaleItemUseCase: ['administrador', 'coordinador', 'verificador'],
    RemoveSaleItemUseCase: ['administrador', 'coordinador', 'verificador'],
    UpdateClientSnapshotUseCase: ['administrador', 'coordinador', 'verificador'],
  },

  saleStatus: {
    ListSaleStatusUseCase: ['administrador', 'coordinador', 'verificador'],
    CreateSaleStatusUseCase: ['administrador'],
    UpdateSaleStatusUseCase: ['administrador'],
    ReorderSaleStatusesUseCase: ['administrador'],
    DeleteSaleStatusUseCase: ['administrador'],
  },

  recording: {
    UploadRecordingUseCase: ['administrador', 'coordinador', 'verificador'],
    ListRecordingsUseCase: ['administrador', 'coordinador', 'verificador'],
    DownloadRecordingUseCase: ['administrador', 'coordinador', 'verificador'],
    DeleteRecordingUseCase: ['administrador', 'coordinador'],
  },
};
```

---

## Matriz de Permisos por Rol

### Clientes

| Acción | Admin | Coord | Verif | Comerc |
|--------|:-----:|:-----:|:-----:|:------:|
| Ver cliente | X | X | X | X |
| Crear cliente | X | X | X | X |
| Actualizar cliente | X | X | X | - |
| Añadir datos | X | X | X | X |

### Productos

| Acción | Admin | Coord | Verif | Comerc |
|--------|:-----:|:-----:|:-----:|:------:|
| Listar productos | X | X | X | X |
| Ver producto | X | X | X | X |
| Crear producto | X | - | - | - |
| Actualizar producto | X | - | - | - |
| Activar/Desactivar | X | - | - | - |

### Ventas

| Acción | Admin | Coord | Verif | Comerc |
|--------|:-----:|:-----:|:-----:|:------:|
| Crear venta | X | X | X | X |
| Listar ventas | X | X | X | - |
| Cambiar estado | X | X | X | - |
| Añadir items | X | X | X | - |
| Actualizar items | X | X | X | - |
| Eliminar items | X | X | X | - |
| Actualizar cliente | X | X | X | - |

### Estados de Venta

| Acción | Admin | Coord | Verif | Comerc |
|--------|:-----:|:-----:|:-----:|:------:|
| Listar estados | X | X | X | - |
| Crear estado | X | - | - | - |
| Actualizar estado | X | - | - | - |
| Reordenar estados | X | - | - | - |
| Eliminar estado | X | - | - | - |

### Grabaciones

| Acción | Admin | Coord | Verif | Comerc |
|--------|:-----:|:-----:|:-----:|:------:|
| Subir grabación | X | X | X | - |
| Listar grabaciones | X | X | X | - |
| Descargar grabación | X | X | X | - |
| Eliminar grabación | X | X | - | - |

---

## Creación de Usuarios

> **IMPORTANTE**: No existe interfaz en el frontend para crear usuarios. Esta operación se realiza mediante el endpoint de registro directamente.

### Usando curl

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "García",
    "username": "jgarcia",
    "password": "ContraseñaSegura123",
    "role": "comercial"
  }'
```

### Usando Postman

1. Método: POST
2. URL: `http://localhost:3000/api/users/register`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "firstName": "Juan",
     "lastName": "García",
     "username": "jgarcia",
     "password": "ContraseñaSegura123",
     "role": "comercial"
   }
   ```

---

## Seguridad

### Hash de Contraseñas

Las contraseñas se almacenan hasheadas con **bcrypt**:

```typescript
import bcrypt from 'bcryptjs';

// Al registrar
const hashedPassword = await bcrypt.hash(password, 10);

// Al hacer login
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### Rate Limiting

Los endpoints de autenticación tienen rate limiting estricto:

```typescript
// 5 intentos por minuto por IP
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: { error: 'Demasiados intentos, espere un minuto' }
});
```

### Protección CSRF (Opcional)

Si se habilita `USE_COOKIE_AUTH=true`, el sistema activa protección CSRF:

```typescript
// El frontend debe:
// 1. Obtener token CSRF: GET /api/users/csrf-token
// 2. Enviar en cada petición: X-CSRF-Token: <token>
```

---

## Variables de Entorno

```bash
# Clave secreta para firmar JWTs (DEBE SER SEGURA EN PRODUCCIÓN)
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura

# Duración del access token (en segundos)
JWT_ACCESS_EXPIRATION=900  # 15 minutos

# Duración del refresh token (en segundos)
JWT_REFRESH_EXPIRATION=604800  # 7 días

# Habilitar autenticación por cookies (opcional)
USE_COOKIE_AUTH=false
```

---

## Buenas Prácticas

1. **Nunca exponer el JWT_SECRET** en el código o repositorios
2. **Usar HTTPS** en producción para proteger los tokens en tránsito
3. **Rotar las claves secretas** periódicamente
4. **Implementar logout** para invalidar refresh tokens
5. **Limitar intentos de login** para prevenir ataques de fuerza bruta
6. **No almacenar información sensible** en el payload del JWT
