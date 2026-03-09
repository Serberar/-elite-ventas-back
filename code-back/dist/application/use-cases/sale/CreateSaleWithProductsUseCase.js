"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSaleWithProductsUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
const client_1 = require("@prisma/client");
function safeJson(input) {
    if (input === null || input === undefined)
        return client_1.Prisma.JsonNull;
    return JSON.parse(JSON.stringify(input));
}
class CreateSaleWithProductsUseCase {
    saleRepo;
    saleStatusRepo;
    productRepo;
    constructor(saleRepo, saleStatusRepo, productRepo) {
        this.saleRepo = saleRepo;
        this.saleStatusRepo = saleStatusRepo;
        this.productRepo = productRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.CreateSaleWithProductsUseCase, 'crear venta con productos');
        // Obtener status inicial si no viene en DTO
        let statusId = dto.statusId;
        if (!statusId) {
            const initialStatus = await this.saleStatusRepo.findInitialStatus();
            if (!initialStatus) {
                throw new Error('No se encontró un estado inicial para las ventas');
            }
            statusId = initialStatus.id;
        }
        const clientSnapshot = safeJson(dto.client);
        const addressSnapshot = safeJson(dto.client?.address ?? null);
        const sale = await this.saleRepo.create({
            clientId: dto.client.id,
            statusId,
            notes: safeJson(dto.notes ?? null),
            metadata: safeJson(dto.metadata ?? null),
            clientSnapshot,
            addressSnapshot,
        });
        let total = 0;
        // Si dto.items está vacío o undefined, skip loop
        const items = Array.isArray(dto.items) ? dto.items : [];
        for (const item of items) {
            let skuSnapshot = null;
            const unitPrice = Number(item.price ?? 0);
            const quantity = Number(item.quantity ?? 0);
            const finalPrice = unitPrice * quantity;
            if (item.productId) {
                const product = await this.productRepo.findById(item.productId);
                if (!product) {
                    throw new Error(`Producto con ID ${item.productId} no encontrado`);
                }
                skuSnapshot = product.sku ?? null;
            }
            await this.saleRepo.addItem(sale.id, {
                productId: item.productId,
                nameSnapshot: item.name,
                skuSnapshot,
                unitPrice,
                quantity,
                finalPrice,
            });
            total += finalPrice;
        }
        // actualizar total
        await this.saleRepo.update(sale.id, { totalAmount: total });
        const payload = safeJson({
            client: dto.client,
            items: dto.items,
            statusId: dto.statusId,
            notes: dto.notes,
            metadata: dto.metadata,
        });
        await this.saleRepo.addHistory({
            saleId: sale.id,
            userId: currentUser.id,
            action: 'create_sale',
            payload,
        });
        prometheusMetrics_1.businessSalesCreated.inc();
        prometheusMetrics_1.businessSaleItemsAdded.inc(items.length);
        const saleWithRelations = await this.saleRepo.findWithRelations(sale.id);
        if (!saleWithRelations) {
            throw new Error('Error al obtener la venta creada');
        }
        return saleWithRelations.sale;
    }
}
exports.CreateSaleWithProductsUseCase = CreateSaleWithProductsUseCase;
