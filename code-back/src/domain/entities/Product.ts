import { Decimal } from '@prisma/client/runtime/library';

export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly sku: string | null,
    public readonly price: number,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly tipo: string = 'unico',
    public readonly periodo: string | null = null,
    public readonly precioBase: number | null = null,
    public readonly precioConsumo: number | null = null,
    public readonly unidadConsumo: string | null = null,
    public readonly empresaId: string = ''
  ) {}

  static fromPrisma(data: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    price: Decimal | number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    tipo?: string | null;
    periodo?: string | null;
    precioBase?: Decimal | number | null;
    precioConsumo?: Decimal | number | null;
    unidadConsumo?: string | null;
    empresaId: string;
  }): Product {
    return new Product(
      data.id,
      data.name,
      data.description,
      data.sku,
      Number(data.price),
      data.active,
      data.createdAt,
      data.updatedAt,
      data.tipo ?? 'unico',
      data.periodo ?? null,
      data.precioBase != null ? Number(data.precioBase) : null,
      data.precioConsumo != null ? Number(data.precioConsumo) : null,
      data.unidadConsumo ?? null,
      data.empresaId
    );
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
      tipo: this.tipo,
      periodo: this.periodo,
      precioBase: this.precioBase,
      precioConsumo: this.precioConsumo,
      unidadConsumo: this.unidadConsumo,
      empresaId: this.empresaId,
    };
  }
}
