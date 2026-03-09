import { Product } from '@domain/entities/Product';
import { PaginationOptions, PaginatedResponse } from '@domain/types';

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  /** Listado paginado de productos */
  findAllPaginated(pagination: PaginationOptions): Promise<PaginatedResponse<Product>>;
  findById(id: string): Promise<Product | null>;
  findBySKU(sku: string): Promise<Product | null>;

  create(data: {
    name: string;
    description?: string | null;
    sku?: string | null;
    price: number;
    tipo?: string;
    periodo?: string | null;
    precioBase?: number | null;
    precioConsumo?: number | null;
    unidadConsumo?: string | null;
  }): Promise<Product>;

  update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      sku?: string | null;
      price?: number;
      tipo?: string;
      periodo?: string | null;
      precioBase?: number | null;
      precioConsumo?: number | null;
      unidadConsumo?: string | null;
    }
  ): Promise<Product>;

  toggleActive(id: string): Promise<Product>;
}
