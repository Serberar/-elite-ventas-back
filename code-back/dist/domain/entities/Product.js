"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
class Product {
    id;
    name;
    description;
    sku;
    price;
    active;
    createdAt;
    updatedAt;
    constructor(id, name, description, sku, price, active, createdAt, updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.sku = sku;
        this.price = price;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromPrisma(data) {
        return new Product(data.id, data.name, data.description, data.sku, Number(data.price), data.active, data.createdAt, data.updatedAt);
    }
    toPrisma() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            sku: this.sku,
            price: this.price,
            active: this.active,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
exports.Product = Product;
