export type AddressInfo = {
  address: string;
  cupsLuz?: string;
  cupsGas?: string;
};

export class Client {
  constructor(
    public readonly id: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly dni: string,
    public readonly email: string,
    public readonly birthday: string,
    public readonly phones: string[],
    public readonly addresses: AddressInfo[],
    public readonly bankAccounts: string[],
    public readonly comments: string[],
    public readonly authorized?: string,
    public readonly businessName?: string,
    public readonly createdAt: Date = new Date(),
    public readonly lastModified: Date = new Date()
  ) {}

  /**
   * Normaliza las direcciones para que siempre sean objetos AddressInfo
   * Maneja datos legacy guardados como strings
   */
  private static normalizeAddresses(addresses: unknown): AddressInfo[] {
    if (!addresses || !Array.isArray(addresses)) return [];

    return addresses.map((addr) => {
      if (typeof addr === 'string') {
        return { address: addr, cupsLuz: '', cupsGas: '' };
      }
      return addr as AddressInfo;
    });
  }

  static fromPrisma(data: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    birthday: string;
    phones: string[];
    addresses: unknown;
    bankAccounts: string[];
    comments: string[];
    authorized?: string;
    businessName?: string;
    createdAt: Date;
    lastModified: Date;
  }): Client {
    return new Client(
      data.id,
      data.firstName,
      data.lastName,
      data.dni,
      data.email,
      data.birthday,
      data.phones ?? [],
      Client.normalizeAddresses(data.addresses),
      data.bankAccounts ?? [],
      data.comments ?? [],
      data.authorized ?? undefined,
      data.businessName ?? undefined,
      data.createdAt,
      data.lastModified
    );
  }

  toPrisma(): {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    birthday: string;
    phones: string[];
    addresses: AddressInfo[];
    bankAccounts: string[];
    comments: string[];
    authorized?: string;
    businessName?: string;
    createdAt: Date;
    lastModified: Date;
  } {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      dni: this.dni,
      email: this.email,
      birthday: this.birthday,
      phones: this.phones,
      addresses: this.addresses,
      bankAccounts: this.bankAccounts,
      comments: this.comments,
      authorized: this.authorized,
      businessName: this.businessName,
      createdAt: this.createdAt,
      lastModified: this.lastModified,
    };
  }
}
