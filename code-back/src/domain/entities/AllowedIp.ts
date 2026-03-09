export class AllowedIp {
  constructor(
    public readonly id: string,
    public readonly ip: string,
    public readonly description: string | null,
    public readonly createdAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    ip: string;
    description: string | null;
    createdAt: Date;
  }): AllowedIp {
    return new AllowedIp(data.id, data.ip, data.description, data.createdAt);
  }
}
