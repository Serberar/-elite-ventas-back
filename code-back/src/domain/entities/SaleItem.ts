export class SaleItem {
  constructor(
    public readonly id: string,
    public readonly saleId: string,
    public readonly productId: string | null,
    public readonly nameSnapshot: string,
    public readonly skuSnapshot: string | null,
    public readonly unitPrice: number,
    public readonly quantity: number,
    public readonly finalPrice: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly tipoSnapshot: string | null = null,
    public readonly periodoSnapshot: string | null = null,
    public readonly precioBaseSnapshot: number | null = null,
    public readonly precioConsumoSnapshot: number | null = null,
    public readonly unidadConsumoSnapshot: string | null = null
  ) {}

  static fromPrisma(data: {
    id: string;
    saleId: string;
    productId?: string | null;
    nameSnapshot: string;
    skuSnapshot?: string | null;
    unitPrice: unknown;
    quantity: number;
    finalPrice: unknown;
    createdAt: Date;
    updatedAt: Date;
    tipoSnapshot?: string | null;
    periodoSnapshot?: string | null;
    precioBaseSnapshot?: unknown;
    precioConsumoSnapshot?: unknown;
    unidadConsumoSnapshot?: string | null;
  }): SaleItem {
    return new SaleItem(
      data.id,
      data.saleId,
      data.productId ?? null,
      data.nameSnapshot,
      data.skuSnapshot ?? null,
      Number(data.unitPrice ?? 0),
      Number(data.quantity ?? 0),
      Number(data.finalPrice ?? 0),
      data.createdAt,
      data.updatedAt,
      data.tipoSnapshot ?? null,
      data.periodoSnapshot ?? null,
      data.precioBaseSnapshot != null ? Number(data.precioBaseSnapshot) : null,
      data.precioConsumoSnapshot != null ? Number(data.precioConsumoSnapshot) : null,
      data.unidadConsumoSnapshot ?? null
    );
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
      tipoSnapshot: this.tipoSnapshot,
      periodoSnapshot: this.periodoSnapshot,
      precioBaseSnapshot: this.precioBaseSnapshot,
      precioConsumoSnapshot: this.precioConsumoSnapshot,
      unidadConsumoSnapshot: this.unidadConsumoSnapshot,
    };
  }
}
