import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { CurrentUser } from '@application/shared/types/CurrentUser';

describe('checkRolePermission', () => {
  it('no lanza error si el rol está permitido', () => {
    const user: CurrentUser = { id: '1', role: 'coordinador', firstName: 'Test', empresaId: '00000000-0000-0000-0000-000000000001' };
    expect(() => checkRolePermission(user, ['administrador', 'coordinador'])).not.toThrow();
  });

  it('lanza error si el rol no está permitido', () => {
    const user: CurrentUser = { id: '1', role: 'comercial', firstName: 'Test', empresaId: '00000000-0000-0000-0000-000000000001' };
    expect(() => checkRolePermission(user, ['administrador', 'coordinador'])).toThrow(
      'No tienes permiso para realizar esta acción'
    );
  });

  it('usa actionName personalizado en el mensaje de error', () => {
    const user: CurrentUser = { id: '1', role: 'comercial', firstName: 'Test', empresaId: '00000000-0000-0000-0000-000000000001' };
    expect(() => checkRolePermission(user, ['administrador'], 'crear clientes')).toThrow(
      'No tienes permiso para realizar crear clientes'
    );
  });
});
