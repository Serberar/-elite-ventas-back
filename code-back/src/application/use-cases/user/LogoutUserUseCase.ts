import { IUserRepository } from '@domain/repositories/IUserRepository';
import jwt from 'jsonwebtoken';

export class LogoutUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(refreshToken: string) {
    if (!refreshToken) return;

    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
      await this.userRepository.clearRefreshToken(payload.id);
    } catch {
      // Ignore errors during logout
    }
  }
}
