"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRolePermission = checkRolePermission;
const AppError_1 = require("../AppError");
function checkRolePermission(currentUser, allowedRoles, actionName = 'esta acción') {
    if (!currentUser || !currentUser.role) {
        throw new AppError_1.AuthorizationError('Usuario no autenticado correctamente. Por favor, vuelve a iniciar sesión.');
    }
    if (!allowedRoles.includes(currentUser.role)) {
        throw new AppError_1.AuthorizationError(`No tienes permiso para realizar ${actionName}`);
    }
}
