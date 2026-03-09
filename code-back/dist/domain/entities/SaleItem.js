"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleItem = void 0;
class SaleItem {
    id;
    saleId;
    productId;
    nameSnapshot;
    skuSnapshot;
    unitPrice;
    quantity;
    finalPrice;
    createdAt;
    updatedAt;
    constructor(id, saleId, productId, nameSnapshot, skuSnapshot, unitPrice, quantity, finalPrice, createdAt, updatedAt) {
        this.id = id;
        this.saleId = saleId;
        this.productId = productId;
        this.nameSnapshot = nameSnapshot;
        this.skuSnapshot = skuSnapshot;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.finalPrice = finalPrice;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromPrisma(data) {
        return new SaleItem(data.id, data.saleId, data.productId ?? null, data.nameSnapshot, data.skuSnapshot ?? null, Number(data.unitPrice ?? 0), Number(data.quantity ?? 0), Number(data.finalPrice ?? 0), data.createdAt, data.updatedAt);
    }
    toPrisma() {
        return {
            id: this.id,
            saleId: this.saleId,
            productId: this.productId,
            nameSnapshot: this.nameSnapshot,
            skuSnapshot: this.skuSnapshot,
            unitPrice: this.unitPrice,
            quantity: this.quantity,
            finalPrice: this.finalPrice,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
exports.SaleItem = SaleItem;
