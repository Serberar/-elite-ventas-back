export interface CurrentUser {
  id: string;
  role: 'administrador' | 'verificador' | 'coordinador' | 'comercial';
  firstName: string;
}
