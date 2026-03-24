export const rolePermissions = {
  client: {
    GetClientUseCase:       ['administrador', 'coordinador', 'comercial'],
    CreateClientUseCase:    ['administrador', 'coordinador', 'comercial'],
    PushDataClientUseCase:  ['administrador', 'coordinador', 'comercial'],
    UpdateClientUseCase:    ['administrador', 'coordinador'],
    DeleteClientUseCase:    ['administrador', 'coordinador'],
  },

  product: {
    ListProductsUseCase:         ['administrador', 'coordinador', 'comercial'],
    GetProductUseCase:           ['administrador', 'coordinador', 'comercial'],
    CreateProductUseCase:        ['administrador', 'coordinador'],
    UpdateProductUseCase:        ['administrador', 'coordinador'],
    ToggleProductActiveUseCase:  ['administrador', 'coordinador'],
    DuplicateProductUseCase:     ['administrador', 'coordinador'],
  },

  sale: {
    AddSaleItemUseCase:              ['administrador', 'coordinador', 'comercial'],
    ChangeSaleStatusUseCase:         ['administrador', 'coordinador'],
    CreateSaleWithProductsUseCase:   ['administrador', 'coordinador', 'comercial'],
    ListSalesWithFiltersUseCase:     ['administrador', 'coordinador', 'comercial'],
    RemoveSaleItemUseCase:           ['administrador', 'coordinador', 'comercial'],
    UpdateSaleItemUseCase:           ['administrador', 'coordinador', 'comercial'],
    UpdateClientSnapshotUseCase:     ['administrador', 'coordinador'],
  },

  saleStatus: {
    ListSaleStatusUseCase:        ['administrador', 'coordinador', 'comercial'],
    CreateSaleStatusUseCase:      ['administrador', 'coordinador'],
    UpdateSaleStatusUseCase:      ['administrador', 'coordinador'],
    ReorderSaleStatusesUseCase:   ['administrador', 'coordinador'],
    DeleteSaleStatusUseCase:      ['administrador', 'coordinador'],
  },

  recording: {
    UploadRecordingUseCase:    ['administrador', 'coordinador'],
    ListRecordingsUseCase:     ['administrador', 'coordinador'],
    DownloadRecordingUseCase:  ['administrador', 'coordinador'],
    DeleteRecordingUseCase:    ['administrador'],
  },

  allowedIp: {
    ListAllowedIpsUseCase:    ['administrador'],
    CreateAllowedIpUseCase:   ['administrador'],
    DeleteAllowedIpUseCase:   ['administrador'],
  },

  signature: {
    GenerateAndSendContractUseCase:  ['administrador', 'coordinador', 'comercial'],
    ResendSignatureRequestUseCase:   ['administrador', 'coordinador', 'comercial'],
    GetSignatureStatusUseCase:       ['administrador', 'coordinador', 'comercial'],
    CancelSignatureRequestUseCase:   ['administrador', 'coordinador', 'comercial'],
  },
};
