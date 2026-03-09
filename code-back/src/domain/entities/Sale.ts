type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;
type NotesArray = Record<string, unknown>[];

export class Sale {
  constructor(
    public readonly id: string,
    public readonly clientId: string,
    public readonly statusId: string,
    public readonly totalAmount: number,
    public readonly notes: NotesArray | null,
    public readonly metadata: JsonValue | null,
    public readonly clientSnapshot: JsonValue | null,
    public readonly addressSnapshot: JsonValue | null,
    public readonly comercial: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly closedAt: Date | null
  ) {}

  static fromPrisma(data: {
    id: string;
    clientId: string;
    statusId: string;
    totalAmount: unknown;
    notes: unknown;
    metadata: unknown;
    clientSnapshot: unknown;
    addressSnapshot: unknown;
    comercial: string | null;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
  }): Sale {
    return new Sale(
      data.id,
      data.clientId,
      data.statusId,
      Number(data.totalAmount ?? 0),
      (data.notes as NotesArray | null) ?? null,
      (data.metadata as JsonValue | null) ?? null,
      (data.clientSnapshot as JsonValue | null) ?? null,
      (data.addressSnapshot as JsonValue | null) ?? null,
      data.comercial ?? null,
      data.createdAt,
      data.updatedAt,
      data.closedAt ?? null
    );
  }

  toPrisma() {
    return {
      id: this.id,
      clientId: this.clientId,
      statusId: this.statusId,
      totalAmount: this.totalAmount,
      notes: this.notes,
      metadata: this.metadata,
      clientSnapshot: this.clientSnapshot,
      addressSnapshot: this.addressSnapshot,
      comercial: this.comercial,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      closedAt: this.closedAt,
    };
  }
}
