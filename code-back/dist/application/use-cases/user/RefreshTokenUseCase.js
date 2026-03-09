"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenUseCase = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class RefreshTokenUseCase {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(refreshToken) {
        if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
            throw new Error('JWT_SECRET o JWT_REFRESH_SECRET no definido');
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await this.userRepository.findById(payload.id);
            if (!user || user.refreshToken !== refreshToken) {
                throw new Error('Token inválido');
            }
            const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, firstName: user.firstName }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
            return { accessToken, user };
        }
        catch (err) {
            if (err instanceof Error && err.message === 'Token inválido') {
                throw err;
            }
            throw new Error('Refresh token inválido o expirado');
        }
    }
}
exports.RefreshTokenUseCase = RefreshTokenUseCase;
