"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recording = void 0;
class Recording {
    id;
    saleId;
    filename;
    storagePath;
    mimeType;
    size;
    uploadedById;
    createdAt;
    constructor(id, saleId, filename, storagePath, mimeType, size, uploadedById, createdAt) {
        this.id = id;
        this.saleId = saleId;
        this.filename = filename;
        this.storagePath = storagePath;
        this.mimeType = mimeType;
        this.size = size;
        this.uploadedById = uploadedById;
        this.createdAt = createdAt;
    }
    static fromPrisma(data) {
        return new Recording(data.id, data.saleId, data.filename, data.storagePath, data.mimeType, data.size, data.uploadedById ?? null, data.createdAt);
    }
    toPrisma() {
        return {
            id: this.id,
            saleId: this.saleId,
            filename: this.filename,
            storagePath: this.storagePath,
            mimeType: this.mimeType,
            size: this.size,
            uploadedById: this.uploadedById,
            createdAt: this.createdAt,
        };
    }
}
exports.Recording = Recording;
