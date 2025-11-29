import { ColumnDefinition } from './Blueprint';

/**
 * Mixin methods for column modifiers
 * These can be chained on column definitions
 */

/**
 * Create a stored generated column (MySQL 5.7+, PostgreSQL)
 */
export function storedAs(column: ColumnDefinition, expression: string): ColumnDefinition {
  column.storedAs = expression;
  return column;
}

/**
 * Create a virtual generated column (MySQL 5.7+)
 */
export function virtualAs(column: ColumnDefinition, expression: string): ColumnDefinition {
  column.virtualAs = expression;
  return column;
}

/**
 * Create a generated identity column (PostgreSQL 10+)
 */
export function generatedAs(column: ColumnDefinition, expression?: string): ColumnDefinition {
  column.generatedAs = expression || 'ALWAYS';
  return column;
}

/**
 * Set the column as invisible (MySQL 8.0.23+)
 */
export function invisible(column: ColumnDefinition): ColumnDefinition {
  column.invisible = true;
  return column;
}

/**
 * Set the column to use CURRENT_TIMESTAMP as default (timestamps)
 */
export function useCurrent(column: ColumnDefinition): ColumnDefinition {
  column.useCurrent = true;
  return column;
}

/**
 * Set the column to update to CURRENT_TIMESTAMP on update (MySQL)
 */
export function useCurrentOnUpdate(column: ColumnDefinition): ColumnDefinition {
  column.useCurrentOnUpdate = true;
  return column;
}

/**
 * Apply nullable modifier
 */
export function nullable(column: ColumnDefinition): ColumnDefinition {
  column.nullable = true;
  return column;
}

/**
 * Apply default value modifier
 */
export function defaultValue(column: ColumnDefinition, value: any): ColumnDefinition {
  column.default = value;
  return column;
}

/**
 * Apply unsigned modifier
 */
export function unsigned(column: ColumnDefinition): ColumnDefinition {
  column.unsigned = true;
  return column;
}

/**
 * Apply unique constraint
 */
export function unique(column: ColumnDefinition): ColumnDefinition {
  column.unique = true;
  return column;
}

/**
 * Apply index
 */
export function index(column: ColumnDefinition): ColumnDefinition {
  column.index = true;
  return column;
}

/**
 * Apply primary key
 */
export function primary(column: ColumnDefinition): ColumnDefinition {
  column.primary = true;
  return column;
}

/**
 * Add comment to column
 */
export function comment(column: ColumnDefinition, text: string): ColumnDefinition {
  column.comment = text;
  return column;
}

/**
 * Place column after another column (MySQL)
 */
export function after(column: ColumnDefinition, columnName: string): ColumnDefinition {
  column.after = columnName;
  return column;
}

/**
 * Place column first in table (MySQL)
 */
export function first(column: ColumnDefinition): ColumnDefinition {
  column.first = true;
  return column;
}

/**
 * Set charset for column (MySQL)
 */
export function charset(column: ColumnDefinition, charsetName: string): ColumnDefinition {
  column.charset = charsetName;
  return column;
}

/**
 * Set collation for column
 */
export function collation(column: ColumnDefinition, collationName: string): ColumnDefinition {
  column.collation = collationName;
  return column;
}

/**
 * Enhance ColumnDefinition prototype with fluent modifier methods
 */
export function enhanceColumnDefinition() {
  const proto = Object.getPrototypeOf({} as ColumnDefinition);
  
  // Only add if not already present
  if (!('storedAs' in proto)) {
    Object.defineProperties(proto, {
      storedAs: {
        value: function(this: ColumnDefinition, expression: string) {
          return storedAs(this, expression);
        },
        writable: true,
        configurable: true,
      },
      virtualAs: {
        value: function(this: ColumnDefinition, expression: string) {
          return virtualAs(this, expression);
        },
        writable: true,
        configurable: true,
      },
      generatedAs: {
        value: function(this: ColumnDefinition, expression?: string) {
          return generatedAs(this, expression);
        },
        writable: true,
        configurable: true,
      },
      invisible: {
        value: function(this: ColumnDefinition) {
          return invisible(this);
        },
        writable: true,
        configurable: true,
      },
      useCurrent: {
        value: function(this: ColumnDefinition) {
          return useCurrent(this);
        },
        writable: true,
        configurable: true,
      },
      useCurrentOnUpdate: {
        value: function(this: ColumnDefinition) {
          return useCurrentOnUpdate(this);
        },
        writable: true,
        configurable: true,
      },
      nullable: {
        value: function(this: ColumnDefinition) {
          return nullable(this);
        },
        writable: true,
        configurable: true,
      },
      default: {
        value: function(this: ColumnDefinition, value: any) {
          return defaultValue(this, value);
        },
        writable: true,
        configurable: true,
      },
      unsigned: {
        value: function(this: ColumnDefinition) {
          return unsigned(this);
        },
        writable: true,
        configurable: true,
      },
      unique: {
        value: function(this: ColumnDefinition) {
          return unique(this);
        },
        writable: true,
        configurable: true,
      },
      index: {
        value: function(this: ColumnDefinition) {
          return index(this);
        },
        writable: true,
        configurable: true,
      },
      primary: {
        value: function(this: ColumnDefinition) {
          return primary(this);
        },
        writable: true,
        configurable: true,
      },
      comment: {
        value: function(this: ColumnDefinition, text: string) {
          return comment(this, text);
        },
        writable: true,
        configurable: true,
      },
      after: {
        value: function(this: ColumnDefinition, columnName: string) {
          return after(this, columnName);
        },
        writable: true,
        configurable: true,
      },
      first: {
        value: function(this: ColumnDefinition) {
          return first(this);
        },
        writable: true,
        configurable: true,
      },
      charset: {
        value: function(this: ColumnDefinition, charsetName: string) {
          return charset(this, charsetName);
        },
        writable: true,
        configurable: true,
      },
      collation: {
        value: function(this: ColumnDefinition, collationName: string) {
          return collation(this, collationName);
        },
        writable: true,
        configurable: true,
      },
    });
  }
}
