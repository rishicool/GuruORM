import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — joins', () => {

  describe('inner join', () => {
    it('generates INNER JOIN with on clause', () => {
      const { builder } = createBuilder('users');
      builder.join('orders', 'users.id', '=', 'orders.user_id');

      expect(builder.toSql()).toContain(
        'inner join `orders` on `users`.`id` = `orders`.`user_id`',
      );
    });
  });

  describe('left join', () => {
    it('generates LEFT JOIN', () => {
      const { builder } = createBuilder('users');
      builder.leftJoin('profiles', 'users.id', '=', 'profiles.user_id');
      expect(builder.toSql()).toContain('left join `profiles`');
    });
  });

  describe('right join', () => {
    it('generates RIGHT JOIN', () => {
      const { builder } = createBuilder('users');
      builder.rightJoin('roles', 'users.role_id', '=', 'roles.id');
      expect(builder.toSql()).toContain('right join `roles`');
    });
  });

  describe('cross join', () => {
    it('generates CROSS JOIN', () => {
      const { builder } = createBuilder('users');
      builder.crossJoin('colors');
      expect(builder.toSql()).toContain('cross join');
    });
  });

  describe('join with closure', () => {
    it('supports complex join conditions', () => {
      const { builder } = createBuilder('users');
      builder.join('orders', (join: any) => {
        join.on('users.id', '=', 'orders.user_id');
        join.on('orders.status', '=', 'active');
      });

      const sql = builder.toSql();
      expect(sql).toContain('inner join `orders`');
      expect(sql).toContain('`users`.`id`');
    });
  });

  describe('joinWhere', () => {
    it('adds join with where condition', () => {
      const { builder } = createBuilder('users');
      builder.joinWhere('orders', 'users.id', '=', 'orders.user_id');

      expect(builder.toSql()).toContain('join');
    });
  });

  describe('leftJoinWhere', () => {
    it('adds left join with where condition', () => {
      const { builder } = createBuilder('users');
      builder.leftJoinWhere('profiles', 'users.id', '=', 'profiles.user_id');

      expect(builder.toSql()).toContain('left join');
    });
  });

  describe('joinSub', () => {
    it('joins a subquery', () => {
      const { builder } = createBuilder('users');
      builder.joinSub(
        (q: any) => q.from('orders').select('user_id'),
        'latest_orders',
        'users.id',
        '=',
        'latest_orders.user_id',
      );

      const sql = builder.toSql();
      expect(sql).toContain('latest_orders');
    });
  });

  describe('leftJoinSub', () => {
    it('left joins a subquery', () => {
      const { builder } = createBuilder('users');
      builder.leftJoinSub(
        (q: any) => q.from('orders'),
        'sub',
        'users.id',
        '=',
        'sub.user_id',
      );

      expect(builder.toSql()).toContain('left join');
    });
  });

  describe('multiple joins', () => {
    it('chains multiple join types', () => {
      const { builder } = createBuilder('users');
      builder
        .join('orders', 'users.id', '=', 'orders.user_id')
        .leftJoin('profiles', 'users.id', '=', 'profiles.user_id');

      const sql = builder.toSql();
      expect(sql).toContain('inner join `orders`');
      expect(sql).toContain('left join `profiles`');
    });
  });
});
