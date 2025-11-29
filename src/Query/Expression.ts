/**
 * Query expression class - represents a raw SQL expression
 * Inspired by Laravel's Expression class
 */
export class Expression {
  protected value: any;

  constructor(value: any) {
    this.value = value;
  }

  /**
   * Get the value of the expression
   */
  getValue(): any {
    return this.value;
  }

  /**
   * Get the value of the expression (alias for getValue)
   */
  toString(): string {
    return String(this.value);
  }
}

/**
 * Helper function to create a raw expression
 */
export function raw(value: any): Expression {
  return new Expression(value);
}
