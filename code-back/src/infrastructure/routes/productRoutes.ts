import { Router } from 'express';
import { ProductController } from '@infrastructure/express/controllers/ProductController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  createProductSchema,
  updateProductSchema,
  toggleProductActiveSchema,
  duplicateProductSchema,
  getProductSchema,
  listProductsSchema,
} from '@infrastructure/express/validation/productSchemas';

const router = Router();

// Listar productos
router.get(
  '/',
  authMiddleware,
  validateRequest(listProductsSchema),
  ProductController.listProducts.bind(ProductController)
);

// Listar productos paginados (nuevo endpoint)
router.get(
  '/paginated',
  authMiddleware,
  ProductController.listProductsPaginated.bind(ProductController)
);

// Obtener producto por ID
router.get(
  '/:id',
  authMiddleware,
  validateRequest(getProductSchema),
  ProductController.getProduct.bind(ProductController)
);

// Crear producto
router.post(
  '/',
  authMiddleware,
  validateRequest(createProductSchema),
  ProductController.createProduct.bind(ProductController)
);

// Actualizar producto
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateProductSchema),
  ProductController.updateProduct.bind(ProductController)
);

// Activar/Desactivar producto
router.patch(
  '/:id/toggle',
  authMiddleware,
  validateRequest(toggleProductActiveSchema),
  ProductController.toggleActive.bind(ProductController)
);

export default router;
