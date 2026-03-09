"use strict";
/**
 * Configuración de Swagger/OpenAPI para documentación de la API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CRM Backend API',
            version: '1.0.0',
            description: 'API REST para gestión de clientes, productos y ventas',
            contact: {
                name: 'Soporte',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT de autenticación',
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                    description: 'Cookie httpOnly con token JWT (si USE_COOKIE_AUTH=true)',
                },
            },
            schemas: {
                // === USUARIO ===
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string', enum: ['administrador', 'coordinador', 'verificador', 'comercial'] },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', example: 'admin' },
                        password: { type: 'string', format: 'password', example: 'Admin123!' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        accessToken: { type: 'string', description: 'Solo si USE_COOKIE_AUTH=false' },
                        refreshToken: { type: 'string', description: 'Solo si USE_COOKIE_AUTH=false' },
                        csrfToken: { type: 'string', description: 'Solo si USE_COOKIE_AUTH=true' },
                    },
                },
                // === CLIENTE ===
                Client: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        dni: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        birthday: { type: 'string', format: 'date' },
                        businessName: { type: 'string' },
                        authorized: { type: 'string' },
                        phones: { type: 'array', items: { type: 'string' } },
                        addresses: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    address: { type: 'string' },
                                    cupsLuz: { type: 'string' },
                                    cupsGas: { type: 'string' },
                                },
                            },
                        },
                        bankAccounts: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateClientRequest: {
                    type: 'object',
                    required: ['firstName', 'lastName', 'dni', 'phones'],
                    properties: {
                        firstName: { type: 'string', minLength: 2, maxLength: 100 },
                        lastName: { type: 'string', minLength: 2, maxLength: 100 },
                        dni: { type: 'string', minLength: 1, maxLength: 20 },
                        email: { type: 'string', format: 'email' },
                        birthday: { type: 'string', format: 'date' },
                        businessName: { type: 'string' },
                        authorized: { type: 'string' },
                        phones: { type: 'array', items: { type: 'string' }, minItems: 1 },
                        addresses: { type: 'array', items: { $ref: '#/components/schemas/AddressInfo' } },
                        bankAccounts: { type: 'array', items: { type: 'string' } },
                    },
                },
                AddressInfo: {
                    type: 'object',
                    required: ['address'],
                    properties: {
                        address: { type: 'string' },
                        cupsLuz: { type: 'string' },
                        cupsGas: { type: 'string' },
                    },
                },
                // === PRODUCTO ===
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        sku: { type: 'string' },
                        price: { type: 'number', format: 'decimal' },
                        active: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateProductRequest: {
                    type: 'object',
                    required: ['name', 'price'],
                    properties: {
                        name: { type: 'string', maxLength: 200 },
                        description: { type: 'string', maxLength: 1000 },
                        sku: { type: 'string', maxLength: 100 },
                        price: { type: 'number', minimum: 0 },
                    },
                },
                // === ESTADO DE VENTA ===
                SaleStatus: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        order: { type: 'integer' },
                        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                        isFinal: { type: 'boolean' },
                        isCancelled: { type: 'boolean' },
                    },
                },
                // === VENTA ===
                Sale: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        clientId: { type: 'string' },
                        statusId: { type: 'string' },
                        totalAmount: { type: 'number' },
                        clientSnapshot: { type: 'object' },
                        addressSnapshot: { type: 'object' },
                        notes: { type: 'array' },
                        metadata: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        closedAt: { type: 'string', format: 'date-time', nullable: true },
                        items: { type: 'array', items: { $ref: '#/components/schemas/SaleItem' } },
                    },
                },
                SaleItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        productId: { type: 'string', nullable: true },
                        nameSnapshot: { type: 'string' },
                        skuSnapshot: { type: 'string', nullable: true },
                        unitPrice: { type: 'number' },
                        quantity: { type: 'integer' },
                        finalPrice: { type: 'number' },
                    },
                },
                CreateSaleRequest: {
                    type: 'object',
                    required: ['client', 'items'],
                    properties: {
                        client: {
                            type: 'object',
                            required: ['id', 'firstName', 'lastName', 'dni', 'phones', 'bankAccounts', 'address'],
                            properties: {
                                id: { type: 'string' },
                                firstName: { type: 'string' },
                                lastName: { type: 'string' },
                                dni: { type: 'string' },
                                email: { type: 'string' },
                                birthday: { type: 'string' },
                                phones: { type: 'array', items: { type: 'string' } },
                                bankAccounts: { type: 'array', items: { type: 'string' } },
                                address: { $ref: '#/components/schemas/AddressInfo' },
                            },
                        },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['productId', 'name', 'quantity', 'price'],
                                properties: {
                                    productId: { type: 'string' },
                                    name: { type: 'string' },
                                    quantity: { type: 'integer', minimum: 1 },
                                    price: { type: 'number', minimum: 0 },
                                },
                            },
                        },
                        statusId: { type: 'string' },
                        notes: { type: 'array' },
                        metadata: { type: 'object' },
                    },
                },
                // === PAGINACIÓN ===
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        hasPrevPage: { type: 'boolean' },
                        hasNextPage: { type: 'boolean' },
                    },
                },
                // === ERRORES ===
                Error: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'error' },
                        code: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
        security: [
            { bearerAuth: [] },
        ],
    },
    apis: [
        './src/infrastructure/routes/*.ts',
        './src/infrastructure/express/swagger/docs/*.ts',
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
