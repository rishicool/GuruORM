import { PostgresGrammar } from '../../../../src/Schema/Grammars/PostgresGrammar';

describe('Schema / Grammars / PostgresGrammar', () => {
  let grammar: PostgresGrammar;

  beforeEach(() => {
    grammar = new PostgresGrammar();
  });

  // ---- SQL compilation methods ----
  test('compileTableExists returns information_schema query', () => {
    const sql = grammar.compileTableExists();
    expect(sql).toContain('information_schema.tables');
    expect(sql).toContain('table_schema');
    expect(sql).toContain('table_name');
  });

  test('compileColumnListing returns column listing query', () => {
    const sql = grammar.compileColumnListing();
    expect(sql).toContain('column_name');
    expect(sql).toContain('information_schema.columns');
  });

  test('compileColumnType returns column type query', () => {
    const sql = grammar.compileColumnType();
    expect(sql).toContain('data_type');
    expect(sql).toContain('information_schema.columns');
  });

  test('compileEnableForeignKeyConstraints', () => {
    expect(grammar.compileEnableForeignKeyConstraints()).toContain('SET CONSTRAINTS ALL IMMEDIATE');
  });

  test('compileDisableForeignKeyConstraints', () => {
    expect(grammar.compileDisableForeignKeyConstraints()).toContain('SET CONSTRAINTS ALL DEFERRED');
  });

  test('compileGetAllTables returns pg_catalog query', () => {
    const sql = grammar.compileGetAllTables();
    expect(sql).toContain('pg_catalog.pg_tables');
  });

  test('compileRenameTable produces ALTER TABLE RENAME', () => {
    const sql = grammar.compileRenameTable('old_table', 'new_table');
    expect(sql.toLowerCase()).toContain('alter table');
    expect(sql.toLowerCase()).toContain('rename to');
  });

  test('compileIndexExists returns pg_indexes query', () => {
    const sql = grammar.compileIndexExists();
    expect(sql).toContain('pg_indexes');
  });

  // ---- getType mapping ----
  describe('getType', () => {
    const getType = (type: string, extra?: any) => {
      return (grammar as any).getType({ type, ...extra });
    };

    test('increments → serial', () => expect(getType('increments')).toBe('serial'));
    test('bigincrements → bigserial', () => expect(getType('bigincrements')).toBe('bigserial'));
    test('string → varchar(255)', () => expect(getType('string')).toBe('varchar(255)'));
    test('string with length → varchar(100)', () => expect(getType('string', { length: 100 })).toBe('varchar(100)'));
    test('text → text', () => expect(getType('text')).toBe('text'));
    test('mediumtext → text', () => expect(getType('mediumtext')).toBe('text'));
    test('longtext → text', () => expect(getType('longtext')).toBe('text'));
    test('integer → integer', () => expect(getType('integer')).toBe('integer'));
    test('int → integer', () => expect(getType('int')).toBe('integer'));
    test('biginteger → bigint', () => expect(getType('biginteger')).toBe('bigint'));
    test('bigint → bigint', () => expect(getType('bigint')).toBe('bigint'));
    test('tinyinteger → smallint', () => expect(getType('tinyinteger')).toBe('smallint'));
    test('tinyint → smallint', () => expect(getType('tinyint')).toBe('smallint'));
    test('smallinteger → smallint', () => expect(getType('smallinteger')).toBe('smallint'));
    test('smallint → smallint', () => expect(getType('smallint')).toBe('smallint'));
    test('mediuminteger → integer', () => expect(getType('mediuminteger')).toBe('integer'));
    test('mediumint → integer', () => expect(getType('mediumint')).toBe('integer'));
    test('float → real', () => expect(getType('float')).toBe('real'));
    test('double → double precision', () => expect(getType('double')).toBe('double precision'));
    test('decimal → decimal(8,2)', () => expect(getType('decimal')).toBe('decimal(8, 2)'));
    test('decimal with precision → decimal(10,4)', () => expect(getType('decimal', { precision: 10, scale: 4 })).toBe('decimal(10, 4)'));
    test('boolean → boolean', () => expect(getType('boolean')).toBe('boolean'));
    test('date → date', () => expect(getType('date')).toBe('date'));
    test('datetime → timestamp', () => expect(getType('datetime')).toBe('timestamp'));
    test('timestamp → timestamp', () => expect(getType('timestamp')).toBe('timestamp'));
    test('time → time', () => expect(getType('time')).toBe('time'));
    test('year → integer', () => expect(getType('year')).toBe('integer'));
    test('char → char(255)', () => expect(getType('char')).toBe('char(255)'));
    test('char with length → char(10)', () => expect(getType('char', { length: 10 })).toBe('char(10)'));
    test('binary → bytea', () => expect(getType('binary')).toBe('bytea'));
    test('enum → varchar(255)', () => expect(getType('enum')).toBe('varchar(255)'));
    test('json → json', () => expect(getType('json')).toBe('json'));
    test('jsonb → jsonb', () => expect(getType('jsonb')).toBe('jsonb'));
    test('unknown type passes through', () => expect(getType('customtype')).toBe('customtype'));
  });

  // ---- compileColumn ----
  describe('compileColumn', () => {
    test('serial primary key', () => {
      const sql = grammar.compileColumn({ name: 'id', type: 'increments', _primary: true });
      expect(sql).toContain('serial');
      expect(sql).toContain('primary key');
    });

    test('bigserial uses bigserial', () => {
      const sql = grammar.compileColumn({ name: 'id', type: 'bigincrements' });
      expect(sql).toContain('bigserial');
    });

    test('nullable column', () => {
      const sql = grammar.compileColumn({ name: 'email', type: 'string', _nullable: true });
      expect(sql).toContain('null');
    });

    test('not null column', () => {
      const sql = grammar.compileColumn({ name: 'name', type: 'string', _nullable: false });
      expect(sql).toContain('not null');
    });

    test('primary key on non-serial', () => {
      const sql = grammar.compileColumn({ name: 'uuid', type: 'string', _primary: true });
      expect(sql).toContain('primary key');
      expect(sql).toContain('not null');
    });

    test('unique constraint', () => {
      const sql = grammar.compileColumn({ name: 'email', type: 'string', _unique: true });
      expect(sql).toContain('unique');
    });

    test('default value', () => {
      const sql = grammar.compileColumn({ name: 'status', type: 'string', _default: 'active' });
      expect(sql).toContain('default');
    });

    test('integer column without modifiers', () => {
      const sql = grammar.compileColumn({ name: 'age', type: 'integer' });
      expect(sql).toContain('integer');
    });

    test('boolean column with default', () => {
      const sql = grammar.compileColumn({ name: 'active', type: 'boolean', _default: true });
      expect(sql).toContain('boolean');
      expect(sql).toContain('default');
    });

    test('uses boolean .primary fallback', () => {
      const sql = grammar.compileColumn({ name: 'id', type: 'integer', primary: true });
      expect(sql).toContain('primary key');
    });

    test('uses boolean .nullable fallback', () => {
      const sql = grammar.compileColumn({ name: 'x', type: 'string', nullable: true });
      expect(sql).toContain('null');
    });

    test('uses boolean .unique fallback', () => {
      const sql = grammar.compileColumn({ name: 'x', type: 'string', unique: true });
      expect(sql).toContain('unique');
    });

    test('uses .default fallback', () => {
      const sql = grammar.compileColumn({ name: 'x', type: 'string', default: 'val' });
      expect(sql).toContain('default');
    });
  });
});
