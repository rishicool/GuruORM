/**
 * Eloquent Collection - placeholder for future implementation
 * Inspired by Laravel's Eloquent Collection
 */
export class Collection<T = any> extends Array<T> {
  /**
   * Create a new collection
   */
  static make<T>(items: T[] = []): Collection<T> {
    return new Collection<T>(...items);
  }

  /**
   * Get all items in the collection
   */
  all(): T[] {
    return [...this];
  }

  /**
   * Get the first item in the collection
   */
  first(): T | undefined {
    return this[0];
  }

  /**
   * Get the last item in the collection
   */
  last(): T | undefined {
    return this[this.length - 1];
  }

  /**
   * Determine if the collection is empty
   */
  isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Determine if the collection is not empty
   */
  isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  /**
   * Get the collection as a plain array
   */
  toArray(): T[] {
    return [...this];
  }

  /**
   * Get the collection as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.toArray());
  }
}
