import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — insert', () => {

  describe('insert', () => {
    it('compiles single record insert', () => {
      const { builder, connection } = createBuilder('users');
      builder.insert({ name: 'Alice', email: 'alice@test.com' });

      expect(connection.insert).toHaveBeenCalled();
      const [sql, bindings] = connection.insert.mock.calls[0];
      expect(sql).toContain('insert into `users`');
      expect(sql).toContain('`name`');
      expect(sql).toContain('`email`');
      expect(bindings).toContain('Alice');
      expect(bindings).toContain('alice@test.com');
    });

    it('returns true for empty array', async () => {
      const { builder } = createBuilder('users');
      const result = await builder.insert([]);
      expect(result).toBe(true);
    });

    it('handles multiple records', () => {
      const { builder, connection } = createBuilder('users');
      builder.insert([
        { name: 'Alice', email: 'alice@test.com' },
        { name: 'Bob', email: 'bob@test.com' },
      ]);

      expect(connection.insert).toHaveBeenCalled();
      const [sql] = connection.insert.mock.calls[0];
      expect(sql).toContain('insert into `users`');
    });
  });

  describe('insertGetId', () => {
    it('delegates to connection insertGetId for mysql', async () => {
      const { builder, connection } = createBuilder('users');
      connection.insertGetId.mockResolvedValue(42);

      const id = await builder.insertGetId({ name: 'Alice' });
      expect(id).toBe(42);
      expect(connection.insertGetId).toHaveBeenCalled();
    });
  });

  describe('insertOrIgnore', () => {
    it('compiles insert or ignore SQL', () => {
      const { builder, connection } = createBuilder('users');
      builder.insertOrIgnore({ name: 'Alice' });

      expect(connection.affectingStatement).toHaveBeenCalled();
      const [sql] = connection.affectingStatement.mock.calls[0];
      expect(sql.toLowerCase()).toContain('insert');
    });

    it('returns 0 for empty array', async () => {
      const { builder } = createBuilder('users');
      const result = await builder.insertOrIgnore([]);
      expect(result).toBe(0);
    });
  });

  describe('insertUsing', () => {
    it('compiles insert using subquery', () => {
      const { builder, connection } = createBuilder('users_archive');
      builder.insertUsing(['name', 'email'], (query: any) => {
        query.from('users').select('name', 'email').where('active', false);
      });

      expect(connection.insert).toHaveBeenCalled();
      const [sql] = connection.insert.mock.calls[0];
      expect(sql.toLowerCase()).toContain('insert into');
      expect(sql).toContain('`users_archive`');
    });
  });

  describe('upsert', () => {
    it('compiles upsert SQL', () => {
      const { builder, connection } = createBuilder('users');
      builder.upsert(
        { email: 'alice@test.com', name: 'Alice' },
        ['email'],
        ['name'],
      );

      expect(connection.affectingStatement).toHaveBeenCalled();
    });

    it('returns 0 for empty array', async () => {
      const { builder } = createBuilder('users');
      const result = await builder.upsert([], ['email']);
      expect(result).toBe(0);
    });
  });

  describe('returning', () => {
    it('sets returning columns', () => {
      const { builder } = createBuilder('users');
      builder.returning(['id', 'uuid']);
      expect(builder.getReturning()).toEqual(['id', 'uuid']);
    });

    it('accepts string argument', () => {
      const { builder } = createBuilder('users');
      builder.returning('id');
      expect(builder.getReturning()).toEqual(['id']);
    });

    it('uses select when RETURNING is set on insert', () => {
      const { builder, connection } = createBuilder('users');
      builder.returning('id').insert({ name: 'Alice' });

      expect(connection.select).toHaveBeenCalled();
    });
  });
});
