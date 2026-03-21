import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — delete', () => {

  describe('delete', () => {
    it('compiles delete SQL', async () => {
      const { builder, connection } = createBuilder('users');
      connection.delete.mockResolvedValue(5);

      const affected = await builder.where('active', false).delete();

      expect(affected).toBe(5);
      expect(connection.delete).toHaveBeenCalled();
      const [sql] = connection.delete.mock.calls[0];
      expect(sql).toContain('delete from `users`');
    });

    it('accepts id shorthand', async () => {
      const { builder, connection } = createBuilder('users');
      connection.delete.mockResolvedValue(1);

      const affected = await builder.delete(42);

      expect(affected).toBe(1);
      const [sql, bindings] = connection.delete.mock.calls[0];
      expect(sql).toContain('delete from `users`');
      expect(bindings).toContain(42);
    });

    it('returns 0 when nothing deleted', async () => {
      const { builder, connection } = createBuilder('users');
      connection.delete.mockResolvedValue(0);

      const affected = await builder.delete(9999);
      expect(affected).toBe(0);
    });
  });

  describe('truncate', () => {
    it('runs truncate statement', async () => {
      const { builder, connection } = createBuilder('users');

      await builder.truncate();

      expect(connection.statement).toHaveBeenCalled();
      const [sql] = connection.statement.mock.calls[0];
      expect(sql.toLowerCase()).toContain('truncate');
    });
  });
});
