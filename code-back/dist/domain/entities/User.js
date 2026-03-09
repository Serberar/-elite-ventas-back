"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
class User {
    id;
    firstName;
    lastName;
    username;
    password;
    role;
    lastLoginAt;
    refreshToken;
    refreshTokenExpiresAt;
    constructor(id, firstName, lastName, username, password, role, lastLoginAt = null, refreshToken, refreshTokenExpiresAt) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.password = password;
        this.role = role;
        this.lastLoginAt = lastLoginAt;
        this.refreshToken = refreshToken;
        this.refreshTokenExpiresAt = refreshTokenExpiresAt;
    }
    static fromPrisma(data) {
        return new User(data.id, data.firstName, data.lastName, data.username, data.password, data.role, data.lastLoginAt, data.refreshToken ?? undefined, data.refreshTokenExpiresAt ?? undefined);
    }
    toPrisma() {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            username: this.username,
            password: this.password,
            role: this.role,
            lastLoginAt: this.lastLoginAt ?? undefined,
            refreshToken: this.refreshToken,
            refreshTokenExpiresAt: this.refreshTokenExpiresAt ?? undefined,
        };
    }
}
exports.User = User;
