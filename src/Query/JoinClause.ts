import { Builder } from './Builder';

export type JoinType = 'inner' | 'left' | 'right' | 'cross';

export class JoinClause {
  public type: JoinType;
  public table: string;
  public wheres: any[] = [];
  protected bindings: any = { where: [] };

  constructor(table: string, type: JoinType = 'inner') {
    this.table = table;
    this.type = type;
  }

  /**
   * Get the current query value bindings
   */
  getBindings(): any[] {
    return this.bindings.where || [];
  }

  /**
   * Add a binding to the query
   */
  addBinding(value: any, type: string = 'where'): this {
    if (!this.bindings[type]) {
      this.bindings[type] = [];
    }

    if (Array.isArray(value)) {
      this.bindings[type] = this.bindings[type].concat(value);
    } else {
      this.bindings[type].push(value);
    }

    return this;
  }

  /**
   * Add a where clause (for joinWhere)
   */
  where(column: string, operator?: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Basic',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add an "on" clause to the join.
   */
  on(
    first: string,
    operator?: string | null,
    second?: string | null,
    boolean: 'and' | 'or' = 'and',
  ): this {
    if (operator === null || operator === undefined) {
      operator = '=';
    }

    if ((second === null || second === undefined) && operator) {
      second = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Column',
      first,
      operator: operator || '=',
      second: second || '',
      boolean,
    });

    return this;
  }

  /**
   * Add an "or on" clause to the join.
   */
  orOn(first: string, operator: string | null = null, second: string | null = null): this {
    return this.on(first, operator, second, 'or');
  }

  /**
   * Add a nested where statement to the query.
   */
  onNested(callback: (join: JoinClause) => void, boolean: 'and' | 'or' = 'and'): this {
    const join = new JoinClause(this.table, this.type);
    callback(join);

    this.wheres.push({
      type: 'Nested',
      query: join,
      boolean,
    });

    return this;
  }
}
