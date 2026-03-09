export const rolePermissions = {
  client: {
    GetClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
    CreateClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
    PushDataClientUseCase: ['administrador', 'verificador', 'coordinador', 'comercial'],
    UpdateClientUseCase: ['administrador', 'verificador', 'coordinador'],
  },

  product: {
    ListProductsUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    GetProductUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
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

  allowedIp: {
    ListAllowedIpsUseCase: ['administrador'],
    CreateAllowedIpUseCase: ['administrador'],
    DeleteAllowedIpUseCase: ['administrador'],
  },

  signature: {
    GenerateAndSendContractUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    ResendSignatureRequestUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    GetSignatureStatusUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
    CancelSignatureRequestUseCase: ['administrador', 'coordinador', 'verificador', 'comercial'],
  },
};
