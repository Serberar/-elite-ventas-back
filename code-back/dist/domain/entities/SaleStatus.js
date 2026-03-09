"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleStatus = void 0;
class SaleStatus {
    id;
    name;
    order;
    color;
    isFinal;
    isCancelled;
    constructor(id, name, order, color, isFinal, isCancelled) {
        this.id = id;
        this.name = name;
        this.order = order;
        this.color = color;
        this.isFinal = isFinal;
        this.isCancelled = isCancelled;
    }
    static fromPrisma(data) {
        return new SaleStatus(data.id, data.name, data.order, data.color, data.isFinal, data.isCancelled);
    }
    toPrisma() {
        return {
            id: this.id,
            name: this.name,
            order: this.order,
            color: this.color,
            isFinal: this.isFinal,
            isCancelled: this.isCancelled,
        };
    }
}
exports.SaleStatus = SaleStatus;
