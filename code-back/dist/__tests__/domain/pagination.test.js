"use strict";
/**
 * Tests unitarios para el módulo de paginación
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pagination_1 = require("../../domain/types/pagination");
describe('Pagination Module', () => {
    describe('parsePaginationOptions', () => {
        it('should return default values when no params provided', () => {
            const result = (0, pagination_1.parsePaginationOptions)();
            expect(result).toEqual({
                page: pagination_1.DEFAULT_PAGE,
                limit: pagination_1.DEFAULT_LIMIT,
            });
        });
        it('should parse string values correctly', () => {
            const result = (0, pagination_1.parsePaginationOptions)('2', '30');
            expect(result).toEqual({
                page: 2,
                limit: 30,
            });
        });
        it('should parse number values correctly', () => {
            const result = (0, pagination_1.parsePaginationOptions)(3, 50);
            expect(result).toEqual({
                page: 3,
                limit: 50,
            });
        });
        it('should use defaults for invalid page values', () => {
            expect((0, pagination_1.parsePaginationOptions)('invalid', '20').page).toBe(pagination_1.DEFAULT_PAGE);
            expect((0, pagination_1.parsePaginationOptions)('-1', '20').page).toBe(pagination_1.DEFAULT_PAGE);
            expect((0, pagination_1.parsePaginationOptions)('0', '20').page).toBe(pagination_1.DEFAULT_PAGE);
        });
        it('should use defaults for invalid limit values', () => {
            expect((0, pagination_1.parsePaginationOptions)('1', 'invalid').limit).toBe(pagination_1.DEFAULT_LIMIT);
            expect((0, pagination_1.parsePaginationOptions)('1', '-5').limit).toBe(pagination_1.DEFAULT_LIMIT);
            expect((0, pagination_1.parsePaginationOptions)('1', '0').limit).toBe(pagination_1.DEFAULT_LIMIT);
        });
        it('should cap limit at MAX_LIMIT', () => {
            const result = (0, pagination_1.parsePaginationOptions)('1', '999');
            expect(result.limit).toBe(pagination_1.MAX_LIMIT);
        });
    });
    describe('calculateOffset', () => {
        it('should calculate offset correctly for page 1', () => {
            expect((0, pagination_1.calculateOffset)(1, 20)).toBe(0);
        });
        it('should calculate offset correctly for page 2', () => {
            expect((0, pagination_1.calculateOffset)(2, 20)).toBe(20);
        });
        it('should calculate offset correctly for page 5 with limit 10', () => {
            expect((0, pagination_1.calculateOffset)(5, 10)).toBe(40);
        });
        it('should handle different limit sizes', () => {
            expect((0, pagination_1.calculateOffset)(3, 50)).toBe(100);
            expect((0, pagination_1.calculateOffset)(3, 25)).toBe(50);
        });
    });
    describe('buildPaginationMeta', () => {
        it('should build correct meta for first page', () => {
            const meta = (0, pagination_1.buildPaginationMeta)(1, 20, 100);
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
            const meta = (0, pagination_1.buildPaginationMeta)(5, 20, 100);
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
            const meta = (0, pagination_1.buildPaginationMeta)(3, 20, 100);
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
            const meta = (0, pagination_1.buildPaginationMeta)(1, 20, 10);
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
            const meta = (0, pagination_1.buildPaginationMeta)(1, 20, 0);
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
            const meta = (0, pagination_1.buildPaginationMeta)(1, 20, 45);
            expect(meta.totalPages).toBe(3); // 45/20 = 2.25 → ceil = 3
        });
    });
});
