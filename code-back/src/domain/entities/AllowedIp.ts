export class AllowedIp {
  constructor(
    public readonly id: string,
    public readonly ip: string,
    public readonly description: string | null,
    public readonly createdAt: Date,
    public readonly empresaId: string = ''
  ) {}

  static fromPrisma(data: {
    id: string;
    ip: string;
    description: string | null;
    createdAt: Date;
    empresaId: string;
  }): AllowedIp {
    return new AllowedIp(data.id, data.ip, data.description, data.createdAt, data.empresaId);
  }
}
