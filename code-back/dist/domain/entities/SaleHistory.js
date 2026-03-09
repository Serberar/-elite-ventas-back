"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleHistory = void 0;
class SaleHistory {
    id;
    saleId;
    userId;
    action;
    payload;
    createdAt;
    constructor(id, saleId, userId, action, payload, createdAt) {
        this.id = id;
        this.saleId = saleId;
        this.userId = userId;
        this.action = action;
        this.payload = payload;
        this.createdAt = createdAt;
    }
    static fromPrisma(data) {
        return new SaleHistory(data.id, data.saleId, data.userId ?? null, data.action, data.payload ?? null, data.createdAt);
    }
    toPrisma() {
        return {
            id: this.id,
            saleId: this.saleId,
            userId: this.userId,
            action: this.action,
            payload: this.payload,
            createdAt: this.createdAt,
        };
    }
}
exports.SaleHistory = SaleHistory;
