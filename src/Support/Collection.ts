// Collection extends Array with intentional signature overrides
/**
 * Collection class - inspired by Laravel and Illuminate
 * Provides a fluent, convenient wrapper for working with arrays
 */
export class Collection<T = any> extends Array<T> {
  /**
   * Create a new collection
   */
  static make<T>(items: T[] = []): Collection<T> {
    return new Collection<T>(...items);
  }

  /**
   * Create a collection from the given value
   */
  static wrap<T>(value: T | T[] | Collection<T>): Collection<T> {
    if (value instanceof Collection) {
      return value;
    }

    return Array.isArray(value) ? new Collection<T>(...value) : new Collection<T>(value);
  }

  /**
   * Get all items in the collection
   */
  all(): T[] {
    return [...this];
  }

  /**
   * Get the average value of a given key
   */
  avg(key?: string | ((item: T) => number)): number {
    const items = this.all();
    if (items.length === 0) return 0;

    const sum = items.reduce((acc, item) => {
      const value = typeof key === 'function' ? key(item) : key ? (item as any)[key] : item;
      return acc + (Number(value) || 0);
    }, 0);

    return sum / items.length;
  }

  /**
   * Chunk the collection into arrays of the given size
   */
  chunk(size: number): Collection<Collection<T>> {
    const chunks: Collection<T>[] = [];

    for (let i = 0; i < this.length; i += size) {
      chunks.push(Collection.from(Array.prototype.slice.call(this, i, i + size)) as unknown as Collection<T>);
    }

    return new Collection<Collection<T>>(...chunks);
  }

  /**
   * Collapse a collection of arrays into a single, flat collection
   */
  collapse(): Collection<any> {
    return new Collection<any>(...this.flat());
  }

  /**
   * Determine if the collection contains a given item
   */
  contains(value: T | ((item: T) => boolean)): boolean {
    if (typeof value === 'function') {
      return this.some(value as (item: T) => boolean);
    }

    return this.includes(value);
  }

  /**
   * Count the number of items in the collection
   */
  count(): number {
    return this.length;
  }

  /**
   * Get the items that are not present in the given items
   */
  diff(items: T[]): Collection<T> {
    return new Collection<T>(...this.filter((item) => !items.includes(item)));
  }

  /**
   * Execute a callback over each item
   */
  each(callback: (item: T, index: number) => void | false): this {
    for (let i = 0; i < this.length; i += 1) {
      if (callback(this[i], i) === false) {
        break;
      }
    }

    return this;
  }

  /**
   * Get all items except for those with the specified keys
   */
  except(...keys: string[]): Collection<any> {
    return this.map((item: any) => {
      if (typeof item !== 'object' || item === null) return item;

      const newItem: any = {};
      Object.keys(item).forEach((key) => {
        if (!keys.includes(key)) {
          newItem[key] = item[key];
        }
      });

      return newItem;
    });
  }

  /**
   * Get the first item in the collection
   */
  first(callback?: (item: T) => boolean): T | undefined {
    if (callback) {
      return this.find(callback);
    }

    return this[0];
  }

  /**
   * Get a flattened array of the items
   */
  flatten(depth?: number): Collection<any> {
    return new Collection<any>(...this.flat(depth));
  }

  /**
   * Flip the items in the collection
   */
  flip(): Collection<any> {
    const flipped: any = {};

    this.forEach((value: any, index) => {
      flipped[value] = index;
    });

    return new Collection<any>(flipped);
  }

  /**
   * Remove an item from the collection by key
   */
  forget(key: number): this {
    this.splice(key, 1);
    return this;
  }

  /**
   * Get an item from the collection by key
   */
  get(key: number, defaultValue?: T): T | undefined {
    return this[key] ?? defaultValue;
  }

  /**
   * Group the collection by a given key
   */
  groupBy(key: string | ((item: T) => string)): Collection<Collection<T>> {
    const groups = new Map<string, T[]>();

    this.forEach((item) => {
      const groupKey = typeof key === 'function' ? key(item) : (item as any)[key];
      const group = groups.get(groupKey) || [];
      group.push(item);
      groups.set(groupKey, group);
    });

    const result: any = {};
    groups.forEach((value, groupKey) => {
      result[groupKey] = new Collection<T>(...value);
    });

    return new Collection<Collection<T>>(result);
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
   * Get the last item in the collection
   */
  last(callback?: (item: T) => boolean): T | undefined {
    if (callback) {
      const filtered = this.filter(callback);
      return filtered[filtered.length - 1];
    }

    return this[this.length - 1];
  }

  /**
   * Run a map over each of the items
   */
  // @ts-expect-error - Intentional override: narrowing Array.map return type from T[] to Collection<U>
  map<U>(callback: (item: T, index: number) => U): Collection<U> {
    return new Collection<U>(...super.map(callback));
  }

  /**
   * Get the max value of a given key
   */
  max(key?: string | ((item: T) => number)): number {
    if (this.length === 0) return -Infinity;

    return Math.max(
      ...this.map((item) => {
        const value = typeof key === 'function' ? key(item) : key ? (item as any)[key] : item;
        return Number(value) || -Infinity;
      })
    );
  }

  /**
   * Get the min value of a given key
   */
  min(key?: string | ((item: T) => number)): number {
    if (this.length === 0) return Infinity;

    return Math.min(
      ...this.map((item) => {
        const value = typeof key === 'function' ? key(item) : key ? (item as any)[key] : item;
        return Number(value) || Infinity;
      })
    );
  }

  /**
   * Get only the items with the specified keys
   */
  only(...keys: string[]): Collection<any> {
    return this.map((item: any) => {
      if (typeof item !== 'object' || item === null) return item;

      const newItem: any = {};
      keys.forEach((key) => {
        if (key in item) {
          newItem[key] = item[key];
        }
      });

      return newItem;
    });
  }

  /**
   * Pluck an array of values from an array
   */
  pluck(valueKey: string, keyColumn?: string): Collection<any> | Record<string, any> {
    if (keyColumn !== undefined) {
      // Return a plain object keyed by keyColumn, with values from valueKey
      const result: Record<string, any> = {};
      for (const item of (this as unknown as any[])) {
        result[item[keyColumn]] = item[valueKey];
      }
      return result as any;
    }
    return this.map((item: any) => item[valueKey]) as unknown as Collection<any>;
  }

  /**
   * Get and remove the last item from the collection
   */
  pop(): T | undefined {
    return super.pop();
  }

  /**
   * Push an item onto the end of the collection
   */
  push(...items: T[]): number {
    return super.push(...items);
  }

  /**
   * Get and remove an item from the collection
   */
  pull(key: number): T | undefined {
    const item = this[key];
    this.splice(key, 1);
    return item;
  }

  /**
   * Reduce the collection to a single value
   */
  // @ts-expect-error - Intentional override: narrowing Array.reduce signature for Collection use
  reduce<U>(callback: (carry: U, item: T) => U, initial: U): U {
    return super.reduce(callback, initial);
  }

  /**
   * Create a collection of all elements that do not pass a given truth test
   */
  reject(callback: (item: T, index: number) => boolean): Collection<T> {
    return new Collection<T>(...this.filter((item, index) => !callback(item, index)));
  }

  /**
   * Reverse the order of the items
   */
  // @ts-expect-error - Intentional override: narrowing Array.reverse return type
  reverse(): Collection<T> {
    return new Collection<T>(...super.reverse());
  }

  /**
   * Shuffle the items in the collection
   */
  shuffle(): Collection<T> {
    const items = [...this];
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return new Collection<T>(...items);
  }

  /**
   * Skip the first {count} items
   */
  skip(count: number): Collection<T> {
    return new Collection<T>(...this.slice(count));
  }

  /**
   * Slice the collection - Laravel-style: slice(offset, length?)
   * offset: start index; length: number of items (not end index)
   */
  // @ts-expect-error - Intentional override: narrowing Array.slice return type
  slice(offset: number, length?: number): Collection<T> {
    const start = offset < 0 ? Math.max(this.length + offset, 0) : offset;
    const end = length !== undefined ? start + length : undefined;
    return Collection.from(Array.prototype.slice.call(this, start, end)) as unknown as Collection<T>;
  }

  /**
   * Sort the collection
   */
  // @ts-expect-error - Intentional override: narrowing Array.sort return type
  sort(callback?: (a: T, b: T) => number): Collection<T> {
    return new Collection<T>(...super.sort(callback));
  }

  /**
   * Sort the collection by a key
   */
  sortBy(key: string | ((item: T) => any)): Collection<T> {
    return this.sort((a, b) => {
      const aVal = typeof key === 'function' ? key(a) : (a as any)[key];
      const bVal = typeof key === 'function' ? key(b) : (b as any)[key];

      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }

  /**
   * Sort the collection by a key in descending order
   */
  sortByDesc(key: string | ((item: T) => any)): Collection<T> {
    return this.sort((a, b) => {
      const aVal = typeof key === 'function' ? key(a) : (a as any)[key];
      const bVal = typeof key === 'function' ? key(b) : (b as any)[key];
      if (aVal > bVal) return -1;
      if (aVal < bVal) return 1;
      return 0;
    });
  }

  /**
   * Key the collection by the given key, returning a plain object
   */
  keyBy(key: string | ((item: T) => string)): Record<string, T> {
    const result: Record<string, T> = {};
    for (const item of this) {
      const k = typeof key === 'function' ? key(item) : String((item as any)[key]);
      result[k] = item;
    }
    return result;
  }

  /**
   * Return items that also exist in the given array/collection
   */
  intersect(items: T[] | Collection<T>): Collection<T> {
    const other = Array.isArray(items) ? items : Array.from(items);
    return new Collection<T>(...this.filter(item => other.includes(item)));
  }

  /**
   * Merge the collection with the given items
   */
  merge(items: T[] | Collection<T>): Collection<T> {
    const other = Array.isArray(items) ? items : Array.from(items);
    return new Collection<T>(...this, ...other);
  }

  /**
   * Concatenate items and return a new Collection (overrides Array.concat)
   */
  // @ts-expect-error - Intentional override: Collection.concat returns Collection<T> instead of T[]
  concat(...args: (T | T[] | Collection<T>)[]): Collection<T> {
    const flat: T[] = [];
    for (const arg of args) {
      if (Array.isArray(arg)) {
        flat.push(...arg);
      } else {
        flat.push(arg as T);
      }
    }
    return new Collection<T>(...Array.from(this), ...flat);
  }

  /**
   * Re-index the collection (returns a fresh Collection with same items)
   */
  // @ts-expect-error - Intentional override: Collection.values() returns Collection<T> for chaining instead of ArrayIterator
  values(): Collection<T> {
    return new Collection<T>(...Array.from(this));
  }

  /**
   * Serialize the collection to a JSON string
   */
  toJson(): string {
    return JSON.stringify(this.toArray());
  }

  /**
   * Sort the collection in descending order
   */
  sortDesc(): Collection<T> {
    return new Collection<T>(...super.sort((a, b) => (a > b ? -1 : 1)));
  }

  /**
   * Get the sum of the given values
   */
  sum(key?: string | ((item: T) => number)): number {
    return this.reduce((carry, item) => {
      const value = typeof key === 'function' ? key(item) : key ? (item as any)[key] : item;
      return carry + (Number(value) || 0);
    }, 0);
  }

  /**
   * Take the first or last {count} items
   */
  take(count: number): Collection<T> {
    if (count < 0) {
      return this.slice(count);
    }

    return this.slice(0, count);
  }

  /**
   * Convert the collection to an array
   */
  toArray(): T[] {
    return [...this];
  }

  /**
   * Convert the collection to an array for JSON serialization
   * This method is called by JSON.stringify() automatically
   */
  toJSON(): T[] {
    return this.toArray();
  }

  /**
   * Get unique items from the collection
   */
  unique(key?: string | ((item: T) => any)): Collection<T> {
    if (!key) {
      return new Collection<T>(...new Set(this));
    }

    const seen = new Set();
    const filtered = Array.prototype.filter.call(this, (item: T) => {
      const value = typeof key === 'function' ? key(item) : (item as any)[key];
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
    return new Collection<T>(...filtered);
  }

  /**
   * Filter the collection
   */
  where(key: string, value: any): Collection<T>;
  where(key: string, operator: string, value: any): Collection<T>;
  where(key: string, operatorOrValue: any, value?: any): Collection<T> {
    let operator = '===';
    let compareValue = operatorOrValue;

    if (value !== undefined) {
      operator = operatorOrValue;
      compareValue = value;
    }

    const filtered = Array.prototype.filter.call(this, (item: any) => {
      const itemValue = item[key];

      switch (operator) {
        case '===':
        case '==':
        case '=':
          return itemValue === compareValue;
        case '!==':
        case '!=':
          return itemValue !== compareValue;
        case '>':
          return itemValue > compareValue;
        case '>=':
          return itemValue >= compareValue;
        case '<':
          return itemValue < compareValue;
        case '<=':
          return itemValue <= compareValue;
        default:
          return itemValue === compareValue;
      }
    });
    return new Collection<T>(...filtered);
  }

  /**
   * Zip the collection together with one or more arrays
   */
  zip(...arrays: any[][]): Collection<any[]> {
    const result: any[][] = [];
    const length = Math.max(this.length, ...arrays.map((arr) => arr.length));

    for (let i = 0; i < length; i += 1) {
      result.push([this[i], ...arrays.map((arr) => arr[i])]);
    }

    return new Collection<any[]>(...result);
  }
}
