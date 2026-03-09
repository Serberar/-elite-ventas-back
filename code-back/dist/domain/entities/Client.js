"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
class Client {
    id;
    firstName;
    lastName;
    dni;
    email;
    birthday;
    phones;
    addresses;
    bankAccounts;
    comments;
    authorized;
    businessName;
    createdAt;
    lastModified;
    constructor(id, firstName, lastName, dni, email, birthday, phones, addresses, bankAccounts, comments, authorized, businessName, createdAt = new Date(), lastModified = new Date()) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.dni = dni;
        this.email = email;
        this.birthday = birthday;
        this.phones = phones;
        this.addresses = addresses;
        this.bankAccounts = bankAccounts;
        this.comments = comments;
        this.authorized = authorized;
        this.businessName = businessName;
        this.createdAt = createdAt;
        this.lastModified = lastModified;
    }
    static fromPrisma(data) {
        return new Client(data.id, data.firstName, data.lastName, data.dni, data.email, data.birthday, data.phones ?? [], data.addresses ?? [], data.bankAccounts ?? [], data.comments ?? [], data.authorized ?? undefined, data.businessName ?? undefined, data.createdAt, data.lastModified);
    }
    toPrisma() {
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
exports.Client = Client;
