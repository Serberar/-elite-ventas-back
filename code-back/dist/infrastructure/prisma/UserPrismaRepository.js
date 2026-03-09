"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPrismaRepository = void 0;
const prismaClient_1 = require("../prisma/prismaClient");
const User_1 = require("../../domain/entities/User");
const resilience_1 = require("../resilience");
class UserPrismaRepository {
    async create(user) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.create({ data: user.toPrisma() }));
    }
    async update(user) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.update({
            where: { id: user.id },
            data: user.toPrisma(),
        }));
    }
    async updateLastLogin(userId, date) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: date },
        }));
    }
    async findByUsername(username) {
        const userData = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.findUnique({ where: { username } }));
        return userData ? User_1.User.fromPrisma(userData) : null;
    }
    async findById(id) {
        const userData = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.findUnique({ where: { id } }));
        return userData ? User_1.User.fromPrisma(userData) : null;
    }
    async saveRefreshToken(userId, token, expiresAt) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: token, refreshTokenExpiresAt: expiresAt },
        }));
    }
    async findByRefreshToken(token) {
        const userData = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.findFirst({ where: { refreshToken: token } }));
        return userData ? User_1.User.fromPrisma(userData) : null;
    }
    async clearRefreshToken(userId) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null, refreshTokenExpiresAt: null },
        }));
    }
}
exports.UserPrismaRepository = UserPrismaRepository;
