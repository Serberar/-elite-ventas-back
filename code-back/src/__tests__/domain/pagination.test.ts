/**
 * Tests unitarios para el módulo de paginación
 */

import {
  parsePaginationOptions,
  calculateOffset,
  buildPaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@domain/types/pagination';

describe('Pagination Module', () => {
  describe('parsePaginationOptions', () => {
    it('should return default values when no params provided', () => {
      const result = parsePaginationOptions();

      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
      });
    });

    it('should parse string values correctly', () => {
      const result = parsePaginationOptions('2', '30');

      expect(result).toEqual({
        page: 2,
        limit: 30,
      });
    });

    it('should parse number values correctly', () => {
      const result = parsePaginationOptions(3, 50);

      expect(result).toEqual({
        page: 3,
        limit: 50,
      });
    });

    it('should use defaults for invalid page values', () => {
      expect(parsePaginationOptions('invalid', '20').page).toBe(DEFAULT_PAGE);
      expect(parsePaginationOptions('-1', '20').page).toBe(DEFAULT_PAGE);
      expect(parsePaginationOptions('0', '20').page).toBe(DEFAULT_PAGE);
    });

    it('should use defaults for invalid limit values', () => {
      expect(parsePaginationOptions('1', 'invalid').limit).toBe(DEFAULT_LIMIT);
      expect(parsePaginationOptions('1', '-5').limit).toBe(DEFAULT_LIMIT);
      expect(parsePaginationOptions('1', '0').limit).toBe(DEFAULT_LIMIT);
    });

    it('should cap limit at MAX_LIMIT', () => {
      const result = parsePaginationOptions('1', '999');

      expect(result.limit).toBe(MAX_LIMIT);
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset correctly for page 1', () => {
      expect(calculateOffset(1, 20)).toBe(0);
    });

    it('should calculate offset correctly for page 2', () => {
      expect(calculateOffset(2, 20)).toBe(20);
    });

    it('should calculate offset correctly for page 5 with limit 10', () => {
      expect(calculateOffset(5, 10)).toBe(40);
    });

    it('should handle different limit sizes', () => {
      expect(calculateOffset(3, 50)).toBe(100);
      expect(calculateOffset(3, 25)).toBe(50);
    });
  });

  describe('buildPaginationMeta', () => {
    it('should build correct meta for first page', () => {
      const meta = buildPaginationMeta(1, 20, 100);

      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasPrevPage: false,
        hasNextPage: true,
      });
    });

    it('should build correct meta for last page', () => {
      const meta = buildPaginationMeta(5, 20, 100);

      expect(meta).toEqual({
        page: 5,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasPrevPage: true,
        hasNextPage: false,
      });
    });

    it('should build correct meta for middle page', () => {
      const meta = buildPaginationMeta(3, 20, 100);

      expect(meta).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasPrevPage: true,
        hasNextPage: true,
      });
    });

    it('should handle single page of results', () => {
      const meta = buildPaginationMeta(1, 20, 10);

      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
      });
    });

    it('should handle empty results', () => {
      const meta = buildPaginationMeta(1, 20, 0);

      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasPrevPage: false,
        hasNextPage: false,
      });
    });

    it('should calculate totalPages correctly with partial pages', () => {
      const meta = buildPaginationMeta(1, 20, 45);

      expect(meta.totalPages).toBe(3); // 45/20 = 2.25 → ceil = 3
    });
  });
});
