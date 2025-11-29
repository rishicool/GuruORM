import { Builder } from '../../src/Query/Builder';
import { Connection } from '../../src/Connection/Connection';
import { Grammar } from '../../src/Query/Grammars/MySqlGrammar';
import { Processor } from '../../src/Query/Processors/Processor';

// Mock connection
class MockConnection extends Connection {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async select(query: string, bindings: any[]): Promise<any[]> {
    return [];
  }
  async insert(query: string, bindings: any[]): Promise<number> {
    return 0;
  }
  async update(query: string, bindings: any[]): Promise<number> {
    return 0;
  }
  async delete(query: string, bindings: any[]): Promise<number> {
    return 0;
  }
  async statement(query: string, bindings: any[]): Promise<boolean> {
    return true;
  }
}

describe('Query Builder - JOIN clauses', () => {
  let builder: Builder;
  let connection: MockConnection;

  beforeEach(() => {
    connection = new MockConnection({ driver: 'mysql', database: 'test' } as any);
    const grammar = new Grammar();
    const processor = new Processor();
    builder = new Builder(connection, grammar, processor);
  });

  test('basic inner join', () => {
    builder
      .select('*')
      .from('users')
      .join('contacts', 'users.id', '=', 'contacts.user_id');

    const sql = builder.toSql();
    expect(sql).toBe('select * from `users` inner join `contacts` on `users`.`id` = `contacts`.`user_id`');
  });

  test('left join', () => {
    builder
      .select('*')
      .from('users')
      .leftJoin('posts', 'users.id', '=', 'posts.user_id');

    const sql = builder.toSql();
    expect(sql).toBe('select * from `users` left join `posts` on `users`.`id` = `posts`.`user_id`');
  });

  test('right join', () => {
    builder
      .select('*')
      .from('users')
      .rightJoin('posts', 'users.id', '=', 'posts.user_id');

    const sql = builder.toSql();
    expect(sql).toBe('select * from `users` right join `posts` on `users`.`id` = `posts`.`user_id`');
  });

  test('cross join', () => {
    builder
      .select('*')
      .from('users')
      .crossJoin('posts');

    const sql = builder.toSql();
    expect(sql).toBe('select * from `users` cross join `posts`');
  });

  test('multiple joins', () => {
    builder
      .select('*')
      .from('users')
      .join('contacts', 'users.id', '=', 'contacts.user_id')
      .leftJoin('posts', 'users.id', '=', 'posts.user_id');

    const sql = builder.toSql();
    expect(sql).toContain('inner join `contacts`');
    expect(sql).toContain('left join `posts`');
  });

  test('join with closure (complex conditions)', () => {
    builder
      .select('*')
      .from('users')
      .join('contacts', (join) => {
        join.on('users.id', '=', 'contacts.user_id')
            .orOn('users.name', '=', 'contacts.name');
      });

    const sql = builder.toSql();
    expect(sql).toContain('inner join `contacts`');
    expect(sql).toContain('or `users`.`name` = `contacts`.`name`');
  });

  test('join where clause', () => {
    builder
      .select('*')
      .from('users')
      .joinWhere('contacts', 'contacts.user_id', '>', '5');

    const sql = builder.toSql();
    expect(sql).toContain('inner join `contacts`');
    expect(sql).toContain('`contacts`.`user_id` > ?');
  });

  test('left join where clause', () => {
    builder
      .select('*')
      .from('users')
      .leftJoinWhere('contacts', 'contacts.active', '=', '1');

    const sql = builder.toSql();
    expect(sql).toContain('left join `contacts`');
    expect(sql).toContain('`contacts`.`active` = ?');
  });
});
