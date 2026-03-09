import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

export function checkRolePermission(
  currentUser: CurrentUser,
  allowedRoles: string[],
  actionName = 'esta acción'
): void {
  if (!currentUser || !currentUser.role) {
    throw new AuthorizationError('Usuario no autenticado correctamente. Por favor, vuelve a iniciar sesión.');
  }

  if (!allowedRoles.includes(currentUser.role)) {
    throw new AuthorizationError(`No tienes permiso para realizar ${actionName}`);
  }
}
