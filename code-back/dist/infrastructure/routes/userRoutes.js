"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../express/controllers/UserController");
const validateRequest_1 = require("../express/middleware/validateRequest");
const userSchemas_1 = require("../express/validation/userSchemas");
const rateLimiter_1 = require("../express/middleware/rateLimiter");
const csrfMiddleware_1 = require("../express/middleware/csrfMiddleware");
const router = (0, express_1.Router)();
// Endpoint para obtener token CSRF (solo necesario si USE_COOKIE_AUTH=true)
router.get('/csrf-token', csrfMiddleware_1.csrfTokenEndpoint);
// Rate limiting estricto para autenticación
router.post('/register', rateLimiter_1.authRateLimiter, csrfMiddleware_1.csrfProtection, // CSRF protection para registro
(0, validateRequest_1.validateRequest)(userSchemas_1.registerUserSchema), UserController_1.UserController.register.bind(UserController_1.UserController));
router.post('/login', rateLimiter_1.authRateLimiter, (0, validateRequest_1.validateRequest)(userSchemas_1.loginUserSchema), UserController_1.UserController.login);
router.post('/refresh', rateLimiter_1.authRateLimiter, csrfMiddleware_1.csrfProtection, // CSRF protection para refresh
UserController_1.UserController.refresh.bind(UserController_1.UserController));
router.post('/logout', csrfMiddleware_1.csrfProtection, // CSRF protection para logout
(0, validateRequest_1.validateRequest)(userSchemas_1.logoutUserSchema), UserController_1.UserController.logout.bind(UserController_1.UserController));
exports.default = router;
