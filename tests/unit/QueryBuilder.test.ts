import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Capsule } from '../../src';

describe('Query Builder', () => {
  let capsule: Capsule;

  beforeAll(() => {
    capsule = new Capsule();
    capsule.addConnection({
      driver: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test',
      username: 'root',
      password: '',
    });
    capsule.setAsGlobal();
  });

  afterAll(async () => {
    await capsule.getDatabaseManager().disconnectAll();
  });

  it('should create a query builder instance', () => {
    const query = Capsule.table('users');
    expect(query).toBeDefined();
  });

  it('should generate correct select SQL', () => {
    const query = Capsule.table('users').where('id', 1);
    const sql = query.toSql();
    expect(sql).toContain('select');
    expect(sql).toContain('from');
    expect(sql).toContain('where');
  });

  // More tests will be added as features are implemented
});
