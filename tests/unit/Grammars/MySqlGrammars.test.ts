import { Grammar } from '../../../src/Query/Grammars/MySqlGrammar';
import { Grammar as SchemaMySqlGrammar } from '../../../src/Schema/Grammars/MySqlGrammar';

describe('Query MySqlGrammar', () => {
  let grammar: Grammar;

  beforeEach(() => {
    grammar = new Grammar();
  });

  test('wrapValue wraps with backticks', () => {
    const result = (grammar as any).wrapValue('users');
    expect(result).toBe('`users`');
  });

  test('wrapValue returns * as-is', () => {
    const result = (grammar as any).wrapValue('*');
    expect(result).toBe('*');
  });

  test('wrapValue escapes backticks in identifier', () => {
    const result = (grammar as any).wrapValue('user`s');
    expect(result).toBe('`user``s`');
  });

  test('wrapValue uses custom wrapIdentifier when set', () => {
    (grammar as any).customWrapIdentifier = (val: string, origImpl: Function) => 
      `[${val}]`;
    const result = (grammar as any).wrapValue('orders');
    expect(result).toBe('[orders]');
  });

  test('compileInsertGetId returns insert SQL', () => {
    const mockQuery = {
      fromTable: 'users',
      columns: ['name', 'email'],
      getReturning: () => [],
    } as any;
    const result = grammar.compileInsertGetId(mockQuery, { name: 'Alice', email: 'a@b.com' });
    expect(result).toContain('insert');
    expect(result).toContain('users');
  });

  test('compileInsertOrIgnore replaces insert with insert ignore', () => {
    const mockQuery = { fromTable: 'users', getReturning: () => [] } as any;
    const result = grammar.compileInsertOrIgnore(mockQuery, [{ name: 'Bob' }]);
    expect(result).toContain('insert ignore');
  });

  test('compileUpsert generates ON DUPLICATE KEY UPDATE', () => {
    const mockQuery = { fromTable: 'users', getReturning: () => [] } as any;
    const result = grammar.compileUpsert(
      mockQuery, 
      [{ id: 1, name: 'Alice', email: 'a@b.com' }],
      ['id'],
      ['name', 'email']
    );
    expect(result).toContain('on duplicate key update');
    expect(result).toContain('`name`');
    expect(result).toContain('values(`name`)');
  });

  test('compileUpsert auto-derives update columns when not specified', () => {
    const mockQuery = { fromTable: 'users', getReturning: () => [] } as any;
    const result = grammar.compileUpsert(
      mockQuery,
      [{ id: 1, name: 'Bob' }],
      ['id']
    );
    expect(result).toContain('on duplicate key update');
    expect(result).toContain('`name`');
    expect(result).not.toContain('values(`id`)');
  });

  test('compileRenameTable generates RENAME TABLE', () => {
    const result = grammar.compileRenameTable('old_table', 'new_table');
    expect(result).toContain('rename table');
    expect(result).toContain('old_table');
    expect(result).toContain('new_table');
  });

  test('compileEnableForeignKeyConstraints', () => {
    expect(grammar.compileEnableForeignKeyConstraints()).toBe('SET FOREIGN_KEY_CHECKS=1;');
  });

  test('compileDisableForeignKeyConstraints', () => {
    expect(grammar.compileDisableForeignKeyConstraints()).toBe('SET FOREIGN_KEY_CHECKS=0;');
  });
});

describe('Schema MySqlGrammar', () => {
  let grammar: SchemaMySqlGrammar;

  beforeEach(() => {
    grammar = new SchemaMySqlGrammar();
  });

  test('wrap uses backticks', () => {
    expect(grammar.wrap('column_name')).toBe('`column_name`');
  });

  test('wrap returns * as-is', () => {
    expect(grammar.wrap('*')).toBe('*');
  });

  test('wrap escapes backticks', () => {
    expect(grammar.wrap('col`name')).toBe('`col``name`');
  });

  test('compileRenameTable generates RENAME TABLE', () => {
    const result = grammar.compileRenameTable('old', 'new');
    expect(result).toContain('rename table');
  });

  test('compileEnableForeignKeyConstraints', () => {
    expect(grammar.compileEnableForeignKeyConstraints()).toBe('SET FOREIGN_KEY_CHECKS=1;');
  });

  test('compileDisableForeignKeyConstraints', () => {
    expect(grammar.compileDisableForeignKeyConstraints()).toBe('SET FOREIGN_KEY_CHECKS=0;');
  });

  test('compileCreateTable with MySQL options (engine, charset, collation, comment)', () => {
    const columns = ['`id` int NOT NULL', '`name` varchar(255)'];
    const result = grammar.compileCreateTable('products', columns, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      comment: "Product's table",
    });
    expect(result).toContain('products');
    expect(result).toContain('engine = InnoDB');
    expect(result).toContain('default charset = utf8mb4');
    expect(result).toContain('collate = utf8mb4_unicode_ci');
    expect(result).toContain("comment = 'Product''s table'"); // escaped single quote
  });

  test('compileCreateTable without options', () => {
    const result = grammar.compileCreateTable('simple', ['`id` int']);
    expect(result).toContain('simple');
    expect(result).not.toContain('engine');
    expect(result).not.toContain('charset');
  });

  test('compileCreateTable with only engine', () => {
    const result = grammar.compileCreateTable('t', ['`id` int'], { engine: 'MyISAM' });
    expect(result).toContain('engine = MyISAM');
    expect(result).not.toContain('charset');
  });
});
