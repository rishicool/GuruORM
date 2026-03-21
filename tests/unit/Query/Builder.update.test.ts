import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — update', () => {

  describe('update', () => {
    it('delegates to connection.update', async () => {
      const { builder, connection } = createBuilder('users');
      connection.update.mockResolvedValue(3);

      const affected = await builder.where('active', false).update({ active: true });

      expect(affected).toBe(3);
      expect(connection.update).toHaveBeenCalled();
      const [sql] = connection.update.mock.calls[0];
      expect(sql).toContain('update `users` set');
    });
  });

  describe('updateOrInsert', () => {
    it('updates when record exists', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1, email: 'a@b.com' }]);
      connection.update.mockResolvedValue(1);

      const result = await builder.updateOrInsert(
        { email: 'a@b.com' },
        { name: 'Updated' },
      );

      expect(result).toBe(true);
      expect(connection.update).toHaveBeenCalled();
    });

    it('inserts when record does not exist', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);
      connection.insert.mockResolvedValue(true);

      const result = await builder.updateOrInsert(
        { email: 'new@test.com' },
        { name: 'New User' },
      );

      expect(result).toBe(true);
      expect(connection.insert).toHaveBeenCalled();
    });

    it('returns true when no values to update but record exists', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }]);

      const result = await builder.updateOrInsert({ email: 'a@b.com' });
      expect(result).toBe(true);
    });
  });

  describe('increment', () => {
    it('increments column by 1 (default)', async () => {
      const { builder, connection } = createBuilder('users');
      connection.update.mockResolvedValue(1);
      await builder.where('id', 1).increment('votes');

      expect(connection.update).toHaveBeenCalled();
      const [sql] = connection.update.mock.calls[0];
      expect(sql).toContain('`votes`');
    });

    it('increments column by given amount', async () => {
      const { builder, connection } = createBuilder('products');
      connection.update.mockResolvedValue(1);
      await builder.where('id', 5).increment('stock', 10);

      expect(connection.update).toHaveBeenCalled();
    });

    it('throws for negative amount', async () => {
      const { builder } = createBuilder('users');
      await expect(builder.increment('votes', -1)).rejects.toThrow(
        'Increment amount must be positive',
      );
    });

    it('includes extra columns in update', async () => {
      const { builder, connection } = createBuilder('users');
      connection.update.mockResolvedValue(1);
      await builder.increment('votes', 1, { updated_at: '2024-01-01' });

      expect(connection.update).toHaveBeenCalled();
    });
  });

  describe('decrement', () => {
    it('decrements column by 1 (default)', async () => {
      const { builder, connection } = createBuilder('users');
      connection.update.mockResolvedValue(1);
      await builder.where('id', 1).decrement('votes');

      expect(connection.update).toHaveBeenCalled();
    });

    it('throws for negative amount', async () => {
      const { builder } = createBuilder('users');
      await expect(builder.decrement('votes', -1)).rejects.toThrow(
        'Decrement amount must be positive',
      );
    });
  });

  describe('incrementEach', () => {
    it('increments multiple columns', async () => {
      const { builder, connection } = createBuilder('counters');
      connection.update.mockResolvedValue(1);
      await builder.incrementEach({ views: 1, clicks: 5 });

      expect(connection.update).toHaveBeenCalled();
    });

    it('throws for negative amount in any column', async () => {
      const { builder } = createBuilder('counters');
      await expect(builder.incrementEach({ views: -1 })).rejects.toThrow(
        'must be positive',
      );
    });
  });

  describe('decrementEach', () => {
    it('decrements multiple columns', async () => {
      const { builder, connection } = createBuilder('counters');
      connection.update.mockResolvedValue(1);
      await builder.decrementEach({ views: 1, clicks: 5 });

      expect(connection.update).toHaveBeenCalled();
    });

    it('throws for negative amount in any column', async () => {
      const { builder } = createBuilder('counters');
      await expect(builder.decrementEach({ views: -1 })).rejects.toThrow(
        'must be positive',
      );
    });
  });
});
