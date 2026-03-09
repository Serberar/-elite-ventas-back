import { SaleStatus } from '@domain/entities/SaleStatus';

export interface ISaleStatusRepository {
  findById(id: string): Promise<SaleStatus | null>;

  list(): Promise<SaleStatus[]>;

  findInitialStatus(): Promise<SaleStatus | null>;

  create(data: {
    name: string;
    order: number;
    color?: string | null;
    isFinal?: boolean;
    isCancelled?: boolean;
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
