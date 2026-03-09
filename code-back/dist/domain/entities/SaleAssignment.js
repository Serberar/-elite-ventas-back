"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleAssignment = void 0;
class SaleAssignment {
    id;
    saleId;
    userId;
    role;
    createdAt;
    constructor(id, saleId, userId, role, createdAt) {
        this.id = id;
        this.saleId = saleId;
        this.userId = userId;
        this.role = role;
        this.createdAt = createdAt;
    }
    static fromPrisma(data) {
        return new SaleAssignment(data.id, data.saleId, data.userId, data.role, data.createdAt);
    }
    toPrisma() {
        return {
            id: this.id,
            saleId: this.saleId,
            userId: this.userId,
            role: this.role,
            createdAt: this.createdAt,
        };
    }
}
exports.SaleAssignment = SaleAssignment;
