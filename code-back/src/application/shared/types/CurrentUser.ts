export interface CurrentUser {
  id: string;
  role: 'administrador' | 'coordinador' | 'comercial';
  firstName: string;
  empresaId: string;
}
