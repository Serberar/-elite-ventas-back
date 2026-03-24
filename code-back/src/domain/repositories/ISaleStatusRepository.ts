import { SaleStatus } from '@domain/entities/SaleStatus';

export interface ISaleStatusRepository {
  findById(id: string): Promise<SaleStatus | null>;

  list(empresaId: string): Promise<SaleStatus[]>;

  findInitialStatus(empresaId: string): Promise<SaleStatus | null>;

  create(data: {
    name: string;
    order: number;
    color?: string | null;
    isFinal?: boolean;
    isCancelled?: boolean;
    empresaId: string;
  }): Promise<SaleStatus>;

  update(
    id: string,
    data: Partial<{
      name: string;
      order: number;
      color?: string | null;
      isFinal?: boolean;
      isCancelled?: boolean;
    }>
  ): Promise<SaleStatus>;

  reorder(orderList: { id: string; order: number }[]): Promise<SaleStatus[]>;

  delete(id: string): Promise<void>;
}
