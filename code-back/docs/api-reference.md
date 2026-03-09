# Referencia de la API REST

## Información General

- **Base URL**: `http://localhost:3000/api`
- **Formato**: JSON
- **Autenticación**: Bearer Token (JWT)

---

## Autenticación

Todos los endpoints (excepto login y register) requieren autenticación.

**Header requerido**:
```
Authorization: Bearer <access_token>
```

---

## Endpoints de Usuarios (`/api/users`)

### POST /users/register

Crea un nuevo usuario en el sistema.

> **Nota**: Este endpoint no tiene interfaz en el frontend. Debe usarse mediante herramientas como Postman o curl.

**Request Body**:
```json
{
  "firstName": "Juan",
  "lastName": "García",
  "username": "jgarcia",
  "password": "contraseña_segura",
  "role": "comercial"
}
```

**Roles disponibles**: `administrador`, `coordinador`, `verificador`, `comercial`

**Response (201)**:
```json
{
  "id": "uuid-del-usuario",
  "username": "jgarcia"
}
```

**Errores**:
- `400`: Datos inválidos o usuario ya existe

---

### POST /users/login

Inicia sesión y obtiene tokens de acceso.

**Request Body**:
```json
{
  "username": "jgarcia",
  "password": "contraseña_segura"
}
```

**Response (200)**:
```json
{
  "id": "uuid-del-usuario",
  "username": "jgarcia",
  "firstName": "Juan",
  "lastName": "García",
  "role": "comercial",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errores**:
- `401`: Usuario o contraseña incorrectos

---

### POST /users/refresh

Renueva el token de acceso usando el refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST /users/logout

Cierra la sesión e invalida el refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200)**:
```json
{
  "message": "Sesión cerrada"
}
```

---

## Endpoints de Clientes (`/api/clients`)

### GET /clients/:value

Busca un cliente por teléfono o DNI.

**Parámetros**:
- `value`: Número de teléfono o DNI del cliente

**Response (200)**:
```json
{
  "id": "uuid-del-cliente",
  "firstName": "María",
  "lastName": "López",
  "dni": "12345678A",
  "email": "maria@email.com",
  "birthday": "1985-03-15",
  "phones": ["666123456", "912345678"],
  "addresses": [
    {
      "address": "Calle Principal 123, Madrid",
      "cupsLuz": "ES0021...",
      "cupsGas": "ES0022..."
    }
  ],
  "bankAccounts": ["ES12 1234 5678 90 1234567890"],
  "comments": ["Cliente preferente"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errores**:
- `404`: Cliente no encontrado

---

### POST /clients

Crea un nuevo cliente.

**Request Body**:
```json
{
  "firstName": "María",
  "lastName": "López",
  "dni": "12345678A",
  "email": "maria@email.com",
  "birthday": "1985-03-15",
  "phones": ["666123456"],
  "addresses": [
    {
      "address": "Calle Principal 123, Madrid"
    }
  ],
  "bankAccounts": []
}
```

**Response (201)**: Cliente creado

---

### PUT /clients/:id

Actualiza los datos de un cliente existente.

**Permisos**: `administrador`, `coordinador`, `verificador`

**Request Body**: Misma estructura que POST (campos opcionales)

---

### POST /clients/:id/push

Añade datos a los arrays del cliente (phones, addresses, bankAccounts, comments).

**Request Body**:
```json
{
  "field": "phones",
  "value": "622334455"
}
```

---

## Endpoints de Productos (`/api/products`)

### GET /products

Lista todos los productos activos.

**Query Parameters**:
- `active`: `true` | `false` (opcional, filtra por estado)

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "name": "Tarifa Luz Básica",
    "description": "Tarifa de luz para hogares",
    "sku": "LUZ-001",
    "price": 45.99,
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### GET /products/paginated

Lista productos con paginación.

**Query Parameters**:
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 10)
- `active`: Filtrar por estado

---

### GET /products/:id

Obtiene un producto por ID.

---

### POST /products

Crea un nuevo producto.

**Permisos**: `administrador`

**Request Body**:
```json
{
  "name": "Tarifa Gas Premium",
  "description": "Tarifa de gas con descuento",
  "sku": "GAS-002",
  "price": 35.50
}
```

---

### PUT /products/:id

Actualiza un producto.

**Permisos**: `administrador`

---

### PATCH /products/:id/toggle

Activa/desactiva un producto.

**Permisos**: `administrador`

**Response (200)**:
```json
{
  "id": "uuid",
  "active": false
}
```

---

## Endpoints de Ventas (`/api/sales`)

### GET /sales/stats

Obtiene estadísticas de ventas.

**Response (200)**:
```json
{
  "total": 150,
  "byStatus": [
    { "statusId": "uuid", "name": "Pendiente", "count": 45 },
    { "statusId": "uuid", "name": "Verificada", "count": 80 },
    { "statusId": "uuid", "name": "Completada", "count": 25 }
  ],
  "thisMonth": 32,
  "thisWeek": 8
}
```

---

### GET /sales/comerciales

Obtiene la lista de comerciales únicos.

**Response (200)**:
```json
["Juan García", "María López", "Pedro Martín"]
```

---

### GET /sales

Lista ventas con filtros.

**Permisos**: `administrador`, `coordinador`, `verificador`

**Query Parameters**:
- `statusId`: Filtrar por estado
- `comercial`: Filtrar por nombre de comercial
- `dateFrom`: Fecha desde (ISO 8601)
- `dateTo`: Fecha hasta (ISO 8601)
- `clientDni`: DNI del cliente

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "clientId": "uuid",
    "statusId": "uuid",
    "status": {
      "id": "uuid",
      "name": "Pendiente",
      "color": "#FFA500",
      "isFinal": false
    },
    "totalAmount": 125.50,
    "comercial": "Juan García",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "client": {
      "firstName": "María",
      "lastName": "López",
      "dni": "12345678A"
    }
  }
]
```

---

### GET /sales/paginated

Lista ventas con paginación.

**Query Parameters**:
- `page`: Número de página
- `limit`: Items por página
- Mismos filtros que GET /sales

---

### GET /sales/:saleId

Obtiene el detalle completo de una venta.

**Response (200)**:
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "client": {
    "id": "uuid",
    "firstName": "María",
    "lastName": "López",
    "dni": "12345678A",
    "email": "maria@email.com",
    "phones": ["666123456"],
    "address": {
      "address": "Calle Principal 123",
      "cupsLuz": "ES0021...",
      "cupsGas": "ES0022..."
    }
  },
  "status": {
    "id": "uuid",
    "name": "Pendiente",
    "color": "#FFA500"
  },
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "nameSnapshot": "Tarifa Luz Básica",
      "skuSnapshot": "LUZ-001",
      "unitPrice": 45.99,
      "quantity": 1,
      "finalPrice": 45.99
    }
  ],
  "totalAmount": 45.99,
  "comercial": "Juan García",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### POST /sales

Crea una nueva venta con productos.

**Request Body**:
```json
{
  "client": {
    "id": "uuid-existente-o-null",
    "firstName": "María",
    "lastName": "López",
    "dni": "12345678A",
    "email": "maria@email.com",
    "birthday": "1985-03-15",
    "phones": ["666123456"],
    "bankAccounts": ["ES12 1234..."],
    "address": {
      "address": "Calle Principal 123, Madrid",
      "cupsLuz": "ES0021...",
      "cupsGas": "ES0022..."
    }
  },
  "items": [
    {
      "productId": "uuid-del-producto",
      "name": "Tarifa Luz Básica",
      "quantity": 1,
      "price": 45.99
    }
  ],
  "comercial": "Juan García"
}
```

**Response (201)**: Venta creada con todos sus datos

---

### POST /sales/:saleId/items

Añade un item a una venta existente.

**Permisos**: `administrador`, `coordinador`, `verificador`

**Request Body**:
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

---

### PUT /sales/:saleId/items/:itemId

Actualiza un item de la venta.

**Request Body**:
```json
{
  "quantity": 2
}
```

---

### DELETE /sales/:saleId/items/:itemId

Elimina un item de la venta.

---

### PATCH /sales/:saleId/status

Cambia el estado de una venta.

**Permisos**: `administrador`, `coordinador`, `verificador`

**Request Body**:
```json
{
  "statusId": "uuid-nuevo-estado"
}
```

---

### PATCH /sales/:saleId/client

Actualiza los datos del cliente en la venta (snapshot).

**Request Body**:
```json
{
  "clientSnapshot": {
    "firstName": "María Actualizado",
    "lastName": "López",
    "dni": "12345678A",
    "address": {
      "address": "Nueva Dirección 456"
    }
  },
  "comercial": "Nuevo Comercial"
}
```

---

## Endpoints de Estados de Venta (`/api/sale-statuses`)

### GET /sale-statuses

Lista todos los estados de venta ordenados.

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "name": "Pendiente",
    "order": 1,
    "color": "#FFA500",
    "isFinal": false,
    "isCancelled": false
  },
  {
    "id": "uuid",
    "name": "Verificada",
    "order": 2,
    "color": "#4CAF50",
    "isFinal": false,
    "isCancelled": false
  },
  {
    "id": "uuid",
    "name": "Completada",
    "order": 3,
    "color": "#2196F3",
    "isFinal": true,
    "isCancelled": false
  }
]
```

---

### POST /sale-statuses

Crea un nuevo estado de venta.

**Permisos**: `administrador`

**Request Body**:
```json
{
  "name": "En Revisión",
  "color": "#9C27B0",
  "isFinal": false,
  "isCancelled": false
}
```

---

### PUT /sale-statuses/:id

Actualiza un estado de venta.

**Permisos**: `administrador`

---

### PATCH /sale-statuses/reorder

Reordena los estados de venta.

**Permisos**: `administrador`

**Request Body**:
```json
{
  "orderedIds": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

---

### DELETE /sale-statuses/:id

Elimina un estado de venta.

**Permisos**: `administrador`

> **Nota**: No se puede eliminar un estado que tenga ventas asociadas.

---

## Endpoints de Grabaciones (`/api/sales/:saleId/recordings`)

### POST /sales/:saleId/recordings

Sube una grabación a una venta.

**Permisos**: `administrador`, `coordinador`, `verificador`

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Archivo de audio/video

**Response (201)**:
```json
{
  "id": "uuid",
  "filename": "grabacion_cliente.mp3",
  "mimeType": "audio/mpeg",
  "size": 1234567,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /sales/:saleId/recordings

Lista las grabaciones de una venta.

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "filename": "grabacion_cliente.mp3",
    "mimeType": "audio/mpeg",
    "size": 1234567,
    "uploadedBy": {
      "id": "uuid",
      "firstName": "Juan",
      "lastName": "García"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### GET /sales/:saleId/recordings/:recordingId

Descarga una grabación.

**Response**: Archivo binario con headers apropiados

---

### DELETE /sales/:saleId/recordings/:recordingId

Elimina una grabación.

**Permisos**: `administrador`, `coordinador`

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos de entrada inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos para esta acción |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto de datos (ej: duplicado) |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

**Formato de error**:
```json
{
  "error": "Mensaje descriptivo del error",
  "details": {} // Opcional, información adicional
}
```

---

## Rate Limiting

- **Endpoints de autenticación**: 5 requests por minuto por IP
- **Endpoints generales**: 100 requests por minuto por IP
