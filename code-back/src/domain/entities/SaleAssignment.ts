export class SaleAssignment {
  constructor(
    public readonly id: string,
    public readonly saleId: string,
    public readonly userId: string,
    public readonly role: string,
    public readonly createdAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    saleId: string;
    userId: string;
    role: string;
    createdAt: Date;
  }): SaleAssignment {
    return new SaleAssignment(data.id, data.saleId, data.userId, data.role, data.createdAt);
  }

  toPrisma() {
    return {
      id: this.id,
      saleId: this.saleId,
      userId: this.userId,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}