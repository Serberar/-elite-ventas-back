export class SaleStatus {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly order: number,
    public readonly color: string | null,
    public readonly isFinal: boolean,
    public readonly isCancelled: boolean,
    public readonly isSystem: boolean,
    public readonly empresaId: string = ''
  ) {}

  static fromPrisma(data: {
    id: string;
    name: string;
    order: number;
    color: string | null;
    isFinal: boolean;
    isCancelled: boolean;
    isSystem: boolean;
    empresaId: string;
  }): SaleStatus {
    return new SaleStatus(
      data.id,
      data.name,
      data.order,
      data.color,
      data.isFinal,
      data.isCancelled,
      data.isSystem,
      data.empresaId
    );
  }

  toPrisma(): {
    id: string;
    name: string;
    order: number;
    color: string | null;
    isFinal: boolean;
    isCancelled: boolean;
    isSystem: boolean;
    empresaId: string;
  } {
    return {
      id: this.id,
      name: this.name,
      order: this.order,
      color: this.color,
      isFinal: this.isFinal,
      isCancelled: this.isCancelled,
      isSystem: this.isSystem,
      empresaId: this.empresaId,
    };
  }
}
