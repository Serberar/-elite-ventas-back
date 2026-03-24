import { Role } from '@prisma/client';

export class User {
  constructor(
    public readonly id: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly username: string,
    public readonly password: string,
    public readonly role: string,
    public readonly empresaId: string = '',
    public readonly active: boolean = true,
    public readonly failedLoginAttempts: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly lastLoginAt: Date | null = null,
    public readonly refreshToken?: string,
    public readonly refreshTokenExpiresAt?: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    role: Role;
    empresaId: string;
    active: boolean;
    failedLoginAttempts: number;
    createdAt: Date;
    lastLoginAt: Date | null;
    refreshToken: string | null;
    refreshTokenExpiresAt: Date | null;
  }): User {
    return new User(
      data.id,
      data.firstName,
      data.lastName,
      data.username,
      data.password,
      data.role,
      data.empresaId,
      data.active,
      data.failedLoginAttempts,
      data.createdAt,
      data.lastLoginAt,
      data.refreshToken ?? undefined,
      data.refreshTokenExpiresAt ?? undefined
    );
  }

  toPrisma(): {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    role: Role;
    empresaId: string;
    active: boolean;
    failedLoginAttempts: number;
    lastLoginAt?: Date;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
  } {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      password: this.password,
      role: this.role as Role,
      empresaId: this.empresaId,
      active: this.active,
      failedLoginAttempts: this.failedLoginAttempts,
      lastLoginAt: this.lastLoginAt ?? undefined,
      refreshToken: this.refreshToken,
      refreshTokenExpiresAt: this.refreshTokenExpiresAt ?? undefined,
    };
  }
}
