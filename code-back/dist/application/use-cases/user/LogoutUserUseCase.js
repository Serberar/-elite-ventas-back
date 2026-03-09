"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutUserUseCase = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class LogoutUserUseCase {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(refreshToken) {
        if (!refreshToken)
            return;
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            await this.userRepository.clearRefreshToken(payload.id);
        }
        catch {
            // Ignore errors during logout
        }
    }
}
exports.LogoutUserUseCase = LogoutUserUseCase;
