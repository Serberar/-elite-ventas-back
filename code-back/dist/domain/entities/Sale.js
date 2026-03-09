"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sale = void 0;
class Sale {
    id;
    clientId;
    statusId;
    totalAmount;
    notes;
    metadata;
    clientSnapshot;
    addressSnapshot;
    createdAt;
    updatedAt;
    closedAt;
    constructor(id, clientId, statusId, totalAmount, notes, metadata, clientSnapshot, addressSnapshot, createdAt, updatedAt, closedAt) {
        this.id = id;
        this.clientId = clientId;
        this.statusId = statusId;
        this.totalAmount = totalAmount;
        this.notes = notes;
        this.metadata = metadata;
        this.clientSnapshot = clientSnapshot;
        this.addressSnapshot = addressSnapshot;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.closedAt = closedAt;
    }
    static fromPrisma(data) {
        return new Sale(data.id, data.clientId, data.statusId, Number(data.totalAmount ?? 0), data.notes ?? null, data.metadata ?? null, data.clientSnapshot ?? null, data.addressSnapshot ?? null, data.createdAt, data.updatedAt, data.closedAt ?? null);
    }
    toPrisma() {
        return {
            id: this.id,
            clientId: this.clientId,
            statusId: this.statusId,
            totalAmount: this.totalAmount,
            notes: this.notes,
            metadata: this.metadata,
            clientSnapshot: this.clientSnapshot,
            addressSnapshot: this.addressSnapshot,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            closedAt: this.closedAt,
        };
    }
}
exports.Sale = Sale;
