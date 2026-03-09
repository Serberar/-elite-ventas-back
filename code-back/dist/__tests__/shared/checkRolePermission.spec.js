"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkRolePermission_1 = require("../../application/shared/authorization/checkRolePermission");
describe('checkRolePermission', () => {
    it('no lanza error si el rol está permitido', () => {
        const user = { id: '1', role: 'coordinador', firstName: 'Test' };
        expect(() => (0, checkRolePermission_1.checkRolePermission)(user, ['administrador', 'coordinador'])).not.toThrow();
    });
    it('lanza error si el rol no está permitido', () => {
        const user = { id: '1', role: 'comercial', firstName: 'Test' };
        expect(() => (0, checkRolePermission_1.checkRolePermission)(user, ['administrador', 'coordinador'])).toThrow('No tienes permiso para realizar esta acción');
    });
    it('usa actionName personalizado en el mensaje de error', () => {
        const user = { id: '1', role: 'comercial', firstName: 'Test' };
        expect(() => (0, checkRolePermission_1.checkRolePermission)(user, ['administrador'], 'crear clientes')).toThrow('No tienes permiso para realizar crear clientes');
    });
});
