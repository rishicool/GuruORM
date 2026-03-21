/**
 * GuruORM Exception Hierarchy
 *
 * Provides structured, production-safe error classes with:
 *  - Dedicated `name` for `instanceof` checks
 *  - Preserved original stack trace
 *  - Structured `toJSON()` for logging pipelines
 *  - Developer-friendly `format()` for console output
 *
 * Usage:
 *   import { QueryException, ModelNotFoundException } from 'guruorm';
 *   try { ... } catch (e) { if (e instanceof QueryException) { ... } }
 */

// ─── Base ────────────────────────────────────────────────────────────────

/**
 * Base error for all GuruORM exceptions.
 * Preserves `originalError` when wrapping lower-level errors.
 */
export class GuruORMError extends Error {
  /** Original error that triggered this exception (if any). */
  readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'GuruORMError';
    this.originalError = originalError;

    // Preserve the original stack when wrapping
    if (originalError?.stack) {
      this.stack = `${this.name}: ${this.message}\n` +
        `--- Caused by ---\n${originalError.stack}`;
    }

    // Ensure prototype chain is correct for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Structured representation suitable for JSON logging pipelines.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      ...(this.originalError ? { cause: this.originalError.message } : {}),
    };
  }

  /**
   * Developer-friendly multi-line format for console / debug output.
   */
  format(): string {
    const lines: string[] = [
      `[${this.name}] ${this.message}`,
    ];
    if (this.stack) {
      const frames = this.extractFrames(this.stack);
      if (frames.length > 0) {
        lines.push('  Stack:');
        for (const f of frames.slice(0, 8)) {
          lines.push(`    at ${f}`);
        }
      }
    }
    return lines.join('\n');
  }

  /** Extract meaningful stack frames (strip internal noise). */
  protected extractFrames(stack: string): string[] {
    return stack
      .split('\n')
      .filter(l => l.trim().startsWith('at '))
      .map(l => l.trim())
      .filter(l =>
        !l.includes('node_modules') &&
        !l.includes('internal/') &&
        !l.includes('<anonymous>')
      );
  }
}

// ─── Query ───────────────────────────────────────────────────────────────

/**
 * Thrown when a database query fails.
 * Captures the SQL, bindings, connection name, and driver for debugging.
 */
export class QueryException extends GuruORMError {
  readonly sql: string;
  readonly bindings: any[];
  readonly connectionName: string;
  readonly driver: string;

  constructor(
    message: string,
    sql: string,
    bindings: any[],
    originalError?: Error,
    connectionName = 'default',
    driver = 'unknown',
  ) {
    const sanitised = QueryException.redactBindings(bindings);
    const fullMessage = `${message} (SQL: ${sql}) (Bindings: ${JSON.stringify(sanitised)}) [Connection: ${connectionName}, Driver: ${driver}]`;
    super(fullMessage, originalError);
    this.name = 'QueryException';
    this.sql = sql;
    this.bindings = bindings;
    this.connectionName = connectionName;
    this.driver = driver;
  }

  /**
   * Redact values that look like secrets before they hit logs.
   * Keeps numbers, booleans, null, and dates; masks long strings.
   */
  private static redactBindings(bindings: any[]): any[] {
    return bindings.map(b => {
      if (b === null || b === undefined) return b;
      if (typeof b === 'number' || typeof b === 'boolean') return b;
      if (b instanceof Date) return b.toISOString();
      if (typeof b === 'string' && b.length > 64) return `${b.slice(0, 6)}…[redacted]`;
      return b;
    });
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      sql: this.sql,
      bindings: this.bindings,
      connection: this.connectionName,
      driver: this.driver,
    };
  }

  override format(): string {
    const lines: string[] = [
      `[${this.name}] ${this.message}`,
      `  SQL:        ${this.sql}`,
      `  Bindings:   ${JSON.stringify(this.bindings)}`,
      `  Connection: ${this.connectionName}`,
      `  Driver:     ${this.driver}`,
    ];

    if (this.originalError) {
      lines.push(`  Cause:      ${this.originalError.message}`);
    }

    if (this.stack) {
      const frames = this.extractFrames(this.stack);
      if (frames.length > 0) {
        lines.push('  Stack:');
        for (const f of frames.slice(0, 8)) {
          lines.push(`    ${f}`);
        }
      }
    }

    return lines.join('\n');
  }
}

// ─── Model ───────────────────────────────────────────────────────────────

/**
 * Thrown when a model lookup (findOrFail, firstOrFail, sole) returns no results.
 */
export class ModelNotFoundException extends GuruORMError {
  readonly model: string;
  readonly ids: (string | number)[];

  constructor(model: string, ids: (string | number)[] = []) {
    const idsStr = ids.length > 0 ? ` [${ids.join(', ')}]` : '';
    super(`No query results for model [${model}]${idsStr} not found.`);
    this.name = 'ModelNotFoundException';
    this.model = model;
    this.ids = ids;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      model: this.model,
      ids: this.ids,
    };
  }
}

// ─── Connection ──────────────────────────────────────────────────────────

/**
 * Thrown when a database connection cannot be established or is misconfigured.
 */
export class ConnectionException extends GuruORMError {
  readonly connectionName: string;
  readonly driver: string;

  constructor(message: string, connectionName = 'default', driver = 'unknown', originalError?: Error) {
    super(`[${connectionName}/${driver}] ${message}`, originalError);
    this.name = 'ConnectionException';
    this.connectionName = connectionName;
    this.driver = driver;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      connection: this.connectionName,
      driver: this.driver,
    };
  }
}

// ─── Relation ────────────────────────────────────────────────────────────

/**
 * Thrown when a relationship method does not exist on a model.
 */
export class RelationNotFoundException extends GuruORMError {
  readonly model: string;
  readonly relation: string;

  constructor(model: string, relation: string) {
    super(`Call to undefined relationship [${relation}] on model [${model}].`);
    this.name = 'RelationNotFoundException';
    this.model = model;
    this.relation = relation;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      model: this.model,
      relation: this.relation,
    };
  }
}

// ─── Multi-records ───────────────────────────────────────────────────────

/**
 * Thrown when `sole()` finds more than one matching record.
 */
export class MultipleRecordsFoundException extends GuruORMError {
  readonly count: number;

  constructor(count: number) {
    super(`${count} records were found, but expected only one.`);
    this.name = 'MultipleRecordsFoundException';
    this.count = count;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), count: this.count };
  }
}
