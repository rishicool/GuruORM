import { Builder } from './Builder';

export type JoinType = 'inner' | 'left' | 'right' | 'cross';

export class JoinClause {
  public type: JoinType;
  public table: string;
  public wheres: any[] = [];

  constructor(table: string, type: JoinType = 'inner') {
    this.table = table;
    this.type = type;
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
    if (operator === null) {
      operator = '=';
    }

    if (second === null && operator) {
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
