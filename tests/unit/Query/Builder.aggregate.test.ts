import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — aggregates', () => {

  describe('count', () => {
    it('delegates to connection via aggregate SQL', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ 'count(*)': 42 }]);

      const result = await builder.count();

      expect(result).toBe(42);
      expect(connection.select).toHaveBeenCalled();
      const [sql] = connection.select.mock.calls[0];
      expect(sql.toLowerCase()).toContain('count');
    });

    it('accepts specific column', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ count: 10 }]);

      const result = await builder.count('email');
      expect(result).toBe(10);
    });
  });

  describe('min', () => {
    it('returns minimum value', async () => {
      const { builder, connection } = createBuilder('products');
      connection.select.mockResolvedValue([{ min: 5.99 }]);

      const result = await builder.min('price');
      expect(result).toBe(5.99);
    });
  });

  describe('max', () => {
    it('returns maximum value', async () => {
      const { builder, connection } = createBuilder('products');
      connection.select.mockResolvedValue([{ max: 999.99 }]);

      const result = await builder.max('price');
      expect(result).toBe(999.99);
    });
  });

  describe('sum', () => {
    it('returns sum of column', async () => {
      const { builder, connection } = createBuilder('orders');
      connection.select.mockResolvedValue([{ sum: 12500 }]);

      const result = await builder.sum('total');
      expect(result).toBe(12500);
    });

    it('returns 0 when no rows', async () => {
      const { builder, connection } = createBuilder('orders');
      connection.select.mockResolvedValue([]);

      const result = await builder.sum('total');
      expect(result).toBe(0);
    });
  });

  describe('avg', () => {
    it('returns average value', async () => {
      const { builder, connection } = createBuilder('products');
      connection.select.mockResolvedValue([{ avg: 49.99 }]);

      const result = await builder.avg('price');
      expect(result).toBe(49.99);
    });
  });

  describe('exists', () => {
    it('returns true when rows exist', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ '1': 1 }]);

      const result = await builder.where('active', true).exists();
      expect(result).toBe(true);
    });

    it('returns false when no rows', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      const result = await builder.where('id', 99999).exists();
      expect(result).toBe(false);
    });
  });

  describe('doesntExist', () => {
    it('returns true when no rows', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      const result = await builder.where('id', 99999).doesntExist();
      expect(result).toBe(true);
    });

    it('returns false when rows exist', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ '1': 1 }]);

      const result = await builder.doesntExist();
      expect(result).toBe(false);
    });
  });
});
