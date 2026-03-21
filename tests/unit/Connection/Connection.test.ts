import { Connection } from '../../../src/Connection/Connection';
import { Expression } from '../../../src/Query/Expression';
import { QueryException } from '../../../src/Errors/GuruORMError';

/**
 * Concrete mock subclass of abstract Connection for testing.
 */
class MockConnection extends Connection {
  public selectResults: any[] = [];
  public insertResult = true;
  public updateResult = 1;
  public deleteResult = 1;
  public statementResult = true;
  public affectingResult = 1;
  public unpreparedResult = true;

  constructor(config: any = {}) {
    super({ database: 'test_db', host: 'localhost', ...config });
  }

  async select(query: string, bindings?: any[]): Promise<any[]> {
    return this.selectResults;
  }

  async insert(query: string, bindings?: any[]): Promise<boolean> {
    return this.insertResult;
  }

  async update(query: string, bindings?: any[]): Promise<number> {
    return this.updateResult;
  }

  async delete(query: string, bindings?: any[]): Promise<number> {
    return this.deleteResult;
  }

  async statement(query: string, bindings?: any[]): Promise<boolean> {
    return this.statementResult;
  }

  async affectingStatement(query: string, bindings?: any[]): Promise<number> {
    return this.affectingResult;
  }

  async unprepared(query: string): Promise<boolean> {
    return this.unpreparedResult;
  }

  protected async createTransaction(): Promise<void> {}
  protected async performCommit(): Promise<void> {}
  protected async performRollBack(toLevel: number): Promise<void> {}
  protected useDefaultQueryGrammar(): void {}
  protected useDefaultSchemaGrammar(): void {}
  protected useDefaultPostProcessor(): void {}
  async disconnect(): Promise<void> {}
  getDriverName(): string { return 'mock'; }
}

describe('Connection / Connection (abstract base — via MockConnection)', () => {
  let conn: MockConnection;

  beforeEach(() => {
    conn = new MockConnection();
  });

  // ---- name ----
  describe('name', () => {
    test('getName returns null by default', () => {
      expect(conn.getName()).toBeNull();
    });

    test('setName / getName', () => {
      conn.setName('primary');
      expect(conn.getName()).toBe('primary');
    });
  });

  // ---- table / query ----
  describe('table / query', () => {
    test('table returns a QueryBuilder with from', () => {
      const qb = conn.table('users');
      expect(qb).toBeDefined();
    });

    test('query returns a QueryBuilder', () => {
      const qb = conn.query();
      expect(qb).toBeDefined();
    });
  });

  // ---- raw ----
  describe('raw', () => {
    test('returns an Expression', () => {
      const expr = conn.raw('NOW()');
      expect(expr).toBeInstanceOf(Expression);
      expect(expr.getValue()).toBe('NOW()');
    });
  });

  // ---- selectOne / scalar ----
  describe('selectOne', () => {
    test('returns first record', async () => {
      conn.selectResults = [{ id: 1 }, { id: 2 }];
      const result = await conn.selectOne('SELECT * FROM t');
      expect(result).toEqual({ id: 1 });
    });

    test('returns null when no results', async () => {
      conn.selectResults = [];
      expect(await conn.selectOne('SELECT * FROM t')).toBeNull();
    });
  });

  describe('scalar', () => {
    test('returns first column of first row', async () => {
      conn.selectResults = [{ count: 42 }];
      expect(await conn.scalar('SELECT COUNT(*)')).toBe(42);
    });

    test('returns null when no results', async () => {
      conn.selectResults = [];
      expect(await conn.scalar('SELECT 1')).toBeNull();
    });
  });

  // ---- transactions ----
  describe('transactions', () => {
    test('beginTransaction increments level', async () => {
      expect(conn.transactionLevel()).toBe(0);
      await conn.beginTransaction();
      expect(conn.transactionLevel()).toBe(1);
    });

    test('commit decrements level', async () => {
      await conn.beginTransaction();
      await conn.commit();
      expect(conn.transactionLevel()).toBe(0);
    });

    test('commit does not go below 0', async () => {
      await conn.commit();
      expect(conn.transactionLevel()).toBe(0);
    });

    test('rollback decrements to specified level', async () => {
      await conn.beginTransaction();
      await conn.beginTransaction();
      expect(conn.transactionLevel()).toBe(2);
      await conn.rollback(0);
      expect(conn.transactionLevel()).toBe(0);
    });

    test('rollback defaults to level - 1', async () => {
      await conn.beginTransaction();
      await conn.beginTransaction();
      await conn.rollback();
      expect(conn.transactionLevel()).toBe(1);
    });

    test('rollback does nothing for invalid level', async () => {
      await conn.beginTransaction();
      await conn.rollback(5); // invalid — too high
      expect(conn.transactionLevel()).toBe(1);
    });

    test('transaction callback commits on success', async () => {
      const result = await conn.transaction(async () => 'ok');
      expect(result).toBe('ok');
      expect(conn.transactionLevel()).toBe(0);
    });

    test('transaction callback rolls back on failure', async () => {
      await expect(
        conn.transaction(async () => { throw new Error('fail'); })
      ).rejects.toThrow('fail');
      expect(conn.transactionLevel()).toBe(0);
    });

    test('transaction retries on failure', async () => {
      let attempt = 0;
      const result = await conn.transaction(async () => {
        attempt++;
        if (attempt < 3) throw new Error('retry');
        return 'success';
      }, 3);
      expect(result).toBe('success');
      expect(attempt).toBe(3);
    });
  });

  // ---- config ----
  describe('getConfig', () => {
    test('returns full config when no option', () => {
      const config = conn.getConfig();
      expect(config.database).toBe('test_db');
    });

    test('returns specific option', () => {
      expect(conn.getConfig('database')).toBe('test_db');
    });
  });

  // ---- grammar ----
  describe('query/schema grammar', () => {
    test('getQueryGrammar returns null initially', () => {
      // May be null since useDefaultQueryGrammar is a no-op
      expect(conn.getQueryGrammar()).toBeNull();
    });

    test('setQueryGrammar sets grammar', () => {
      const grammar = { setTablePrefix: jest.fn() };
      conn.setQueryGrammar(grammar);
      expect(conn.getQueryGrammar()).toBe(grammar);
    });

    test('setQueryGrammar applies wrapIdentifier when configured', () => {
      const wrapFn = jest.fn();
      const c = new MockConnection({ database: 'db', wrapIdentifier: wrapFn });
      const grammar = { setWrapIdentifier: jest.fn(), setTablePrefix: jest.fn() };
      c.setQueryGrammar(grammar);
      expect(grammar.setWrapIdentifier).toHaveBeenCalledWith(wrapFn);
    });

    test('getSchemaGrammar / setSchemaGrammar', () => {
      expect(conn.getSchemaGrammar()).toBeNull();
      const grammar = {};
      conn.setSchemaGrammar(grammar);
      expect(conn.getSchemaGrammar()).toBe(grammar);
    });
  });

  // ---- post processor ----
  describe('post processor', () => {
    test('getPostProcessor / setPostProcessor', () => {
      expect(conn.getPostProcessor()).toBeNull();
      const proc = {};
      conn.setPostProcessor(proc);
      expect(conn.getPostProcessor()).toBe(proc);
    });
  });

  // ---- schema builder ----
  describe('getSchemaBuilder', () => {
    test('returns SchemaBuilder', () => {
      const sb = conn.getSchemaBuilder();
      expect(sb).toBeDefined();
    });
  });

  // ---- table prefix ----
  describe('table prefix', () => {
    test('getTablePrefix returns prefix', () => {
      const c = new MockConnection({ database: 'db', prefix: 'app_' });
      expect(c.getTablePrefix()).toBe('app_');
    });

    test('setTablePrefix updates prefix and grammar', () => {
      const grammar = { setTablePrefix: jest.fn() };
      conn.setQueryGrammar(grammar);
      conn.setTablePrefix('new_');
      expect(conn.getTablePrefix()).toBe('new_');
      expect(grammar.setTablePrefix).toHaveBeenCalledWith('new_');
    });
  });

  // ---- reconnect ----
  describe('reconnect', () => {
    test('calls reconnector when set', async () => {
      const spy = jest.fn();
      conn.setReconnector(spy);
      await conn.reconnect();
      expect(spy).toHaveBeenCalled();
    });

    test('throws when no reconnector', async () => {
      await expect(conn.reconnect()).rejects.toThrow('No reconnector configured');
    });
  });

  // ---- database name ----
  describe('database name', () => {
    test('getDatabaseName returns config database', () => {
      expect(conn.getDatabaseName()).toBe('test_db');
    });

    test('setDatabaseName updates config', () => {
      conn.setDatabaseName('new_db');
      expect(conn.getDatabaseName()).toBe('new_db');
    });

    test('getSchemaName defaults to getDatabaseName', () => {
      expect(conn.getSchemaName()).toBe('test_db');
    });
  });

  // ---- pretending ----
  describe('pretending', () => {
    test('returns false by default', () => {
      expect(conn.pretending()).toBe(false);
    });
  });

  // ---- query log ----
  describe('query logging', () => {
    test('logging disabled by default', () => {
      expect(conn.logging()).toBe(false);
    });

    test('enableQueryLog / disableQueryLog', () => {
      conn.enableQueryLog();
      expect(conn.logging()).toBe(true);
      conn.disableQueryLog();
      expect(conn.logging()).toBe(false);
    });

    test('logQuery adds to log when enabled', () => {
      conn.enableQueryLog();
      conn.logQuery('SELECT 1', [], 5);
      conn.logQuery('SELECT 2', [1], 3);
      const log = conn.getQueryLog();
      expect(log).toHaveLength(2);
      expect(log[0]).toEqual({ query: 'SELECT 1', bindings: [], time: 5 });
    });

    test('logQuery does not log when disabled', () => {
      conn.logQuery('SELECT 1', [], 1);
      expect(conn.getQueryLog()).toHaveLength(0);
    });

    test('flushQueryLog clears log', () => {
      conn.enableQueryLog();
      conn.logQuery('SELECT 1', [], 1);
      conn.flushQueryLog();
      expect(conn.getQueryLog()).toHaveLength(0);
    });
  });

  // ---- handleQueryException ----
  describe('handleQueryException', () => {
    test('returns QueryException with details', () => {
      const err = new Error('syntax error');
      const ex = (conn as any).handleQueryException(err, 'SELECT bad', [1]);
      expect(ex).toBeInstanceOf(QueryException);
      expect(ex.message).toContain('syntax error');
    });
  });

  // ---- client ----
  describe('getClient / getReadClient', () => {
    test('getClient returns null initially', () => {
      expect(conn.getClient()).toBeNull();
    });

    test('getReadClient returns client when no readClient', () => {
      (conn as any).client = 'main';
      expect(conn.getReadClient()).toBe('main');
    });

    test('getReadClient returns readClient when set', () => {
      (conn as any).client = 'main';
      (conn as any).readClient = 'read';
      expect(conn.getReadClient()).toBe('read');
    });
  });

  // ---- postProcessResponse ----
  describe('postProcessResponse', () => {
    test('returns result directly when no hook', () => {
      expect(conn.postProcessResponse({ id: 1 })).toEqual({ id: 1 });
    });

    test('applies hook when configured', () => {
      const c = new MockConnection({
        database: 'db',
        postProcessResponse: (result: any) => ({ ...result, processed: true }),
      });
      expect(c.postProcessResponse({ id: 1 })).toEqual({ id: 1, processed: true });
    });
  });

  // ---- useNullAsDefault ----
  describe('useNullAsDefault', () => {
    test('returns false by default', () => {
      expect(conn.useNullAsDefault()).toBe(false);
    });

    test('returns true when configured', () => {
      const c = new MockConnection({ database: 'db', useNullAsDefault: true });
      expect(c.useNullAsDefault()).toBe(true);
    });
  });

  // ---- getLogger ----
  describe('getLogger', () => {
    test('returns a ConnectionLogger instance', () => {
      expect(conn.getLogger()).toBeDefined();
    });
  });
});
