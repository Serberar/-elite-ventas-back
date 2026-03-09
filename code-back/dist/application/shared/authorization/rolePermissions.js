"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolePermissions = void 0;
exports.rolePermissions = {
    client: {
        GetClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
        CreateClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
        PushDataClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
        UpdateClientUseCase: ['administrador', 'verificador', 'coordinador'],
    },
    product: {
        ListProductsUseCase: ['administrador', 'coordinador', 'verificador'],
        GetProductUseCase: ['administrador', 'coordinador', 'verificador'],
        CreateProductUseCase: ['administrador'],
        UpdateProductUseCase: ['administrador'],
        ToggleProductActiveUseCase: ['administrador'],
        DuplicateProductUseCase: ['administrador'],
    },
    sale: {
        AddSaleItemUseCase: ['administrador', 'coordinador', 'verificador'],
        ChangeSaleStatusUseCase: ['administrador', 'coordinador', 'verificador'],
        CreateSaleWithProductsUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
        ListSalesWithFiltersUseCase: ['administrador', 'coordinador', 'verificador'],
        RemoveSaleItemUseCase: ['administrador', 'coordinador', 'verificador'],
        UpdateSaleItemUseCase: ['administrador', 'coordinador', 'verificador'],
        UpdateClientSnapshotUseCase: ['administrador', 'coordinador', 'verificador'],
    },
    saleStatus: {
        ListSaleStatusUseCase: ['administrador', 'coordinador', 'verificador'],
        CreateSaleStatusUseCase: ['administrador'],
        UpdateSaleStatusUseCase: ['administrador'],
        ReorderSaleStatusesUseCase: ['administrador'],
        DeleteSaleStatusUseCase: ['administrador'],
    },
    recording: {
        UploadRecordingUseCase: ['administrador', 'coordinador', 'verificador'],
        ListRecordingsUseCase: ['administrador', 'coordinador', 'verificador'],
        DownloadRecordingUseCase: ['administrador', 'coordinador', 'verificador'],
        DeleteRecordingUseCase: ['administrador', 'coordinador'],
    },
};
