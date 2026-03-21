import { Model } from './Model';

/**
 * Eloquent Collection - collection of Eloquent models
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
   * Get the number of items in the collection
   */
  count(): number {
    return this.length;
  }

  /**
   * Determine if the collection is not empty
   */
  isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  /**
   * Get the collection as a plain array
   * Models are converted to plain objects
   */
  toArray(): any[] {
    return this.map((item: any) => {
      if (item && typeof item.toArray === 'function') {
        return item.toArray();
      }
      return item;
    });
  }

  /**
   * Get the collection as an array for JSON serialization
   * This method is called by JSON.stringify() automatically
   */
  toJSON(): any[] {
    return this.toArray();
  }

  /**
   * Find a model by its primary key.
   * Uses Array.prototype.find explicitly to avoid infinite recursion
   * since this method shadows Array's native find().
   */
  find(key: any): T | undefined {
    return Array.prototype.find.call(this, (item: any) => {
      if (item instanceof Model) {
        return item.getKey() === key;
      }
      return item.id === key;
    });
  }

  /**
   * Get the model keys
   */
  modelKeys(): any[] {
    return this.map((item: any) => {
      if (item instanceof Model) {
        return item.getKey();
      }
      return item.id;
    });
  }

  /**
   * Reload all models from the database
   */
  async fresh(): Promise<Collection<T>> {
    if (this.isEmpty()) {
      return this;
    }

    const firstItem = this.first() as any;
    if (!(firstItem instanceof Model)) {
      return this;
    }

    const keys = this.modelKeys();
    const ModelClass = firstItem.constructor as typeof Model;
    
    const freshModels = await (ModelClass as any).whereIn(firstItem.getKeyName(), keys).get();
    
    return Collection.make(freshModels);
  }

  /**
   * Check if the collection contains a given model
   */
  contains(key: any, operator?: string, value?: any): boolean {
    if (arguments.length === 1) {
      // Check if contains model with this key
      return this.some((item: any) => {
        if (item instanceof Model) {
          return item.getKey() === key;
        }
        return item === key;
      });
    }

    // Check if any model has this attribute value
    return this.some((item: any) => {
      const itemValue = item[key];
      if (operator && value !== undefined) {
        return this.compareValues(itemValue, operator, value);
      }
      return itemValue === operator;
    });
  }

  /**
   * Get unique models
   */
  unique(key?: string): Collection<T> {
    if (!key) {
      return Collection.make([...new Set(this)]);
    }

    const seen = new Set();
    const unique = this.filter((item: any) => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });

    return Collection.make(unique);
  }

  /**
   * Get the difference between collections
   */
  diff(other: Collection<T>): Collection<T> {
    const otherKeys = new Set(other.modelKeys());
    
    return Collection.make(
      this.filter((item: any) => {
        const key = item instanceof Model ? item.getKey() : item.id;
        return !otherKeys.has(key);
      })
    );
  }

  /**
   * Get the intersection of collections
   */
  intersect(other: Collection<T>): Collection<T> {
    const otherKeys = new Set(other.modelKeys());
    
    return Collection.make(
      this.filter((item: any) => {
        const key = item instanceof Model ? item.getKey() : item.id;
        return otherKeys.has(key);
      })
    );
  }

  /**
   * Make models visible
   */
  makeVisible(attributes: string | string[]): Collection<T> {
    const attrs = Array.isArray(attributes) ? attributes : [attributes];
    
    this.forEach((item: any) => {
      if (item instanceof Model && item.makeVisible) {
        item.makeVisible(attrs);
      }
    });

    return this;
  }

  /**
   * Make models hidden
   */
  makeHidden(attributes: string | string[]): Collection<T> {
    const attrs = Array.isArray(attributes) ? attributes : [attributes];
    
    this.forEach((item: any) => {
      if (item instanceof Model && item.makeHidden) {
        item.makeHidden(attrs);
      }
    });

    return this;
  }

  /**
   * Load relationships on all models
   */
  async load(relations: string | string[]): Promise<Collection<T>> {
    if (this.isEmpty()) {
      return this;
    }

    const rels = Array.isArray(relations) ? relations : [relations];
    
    for (const item of this) {
      if (item instanceof Model && (item as any).load) {
        await (item as any).load(rels);
      }
    }

    return this;
  }

  /**
   * Compare two values with an operator
   */
  protected compareValues(a: any, operator: string, b: any): boolean {
    switch (operator) {
      case '=':
      case '==':
        return a == b;
      case '===':
        return a === b;
      case '!=':
      case '<>':
        return a != b;
      case '!==':
        return a !== b;
      case '<':
        return a < b;
      case '>':
        return a > b;
      case '<=':
        return a <= b;
      case '>=':
        return a >= b;
      default:
        return false;
    }
  }

  /**
   * Get a dictionary keyed by the given key
   */
  getDictionary(key?: string): Record<string, T> {
    const dict: Record<string, T> = {};
    for (const item of this) {
      const k = key
        ? (item instanceof Model ? item.getAttribute(key) : (item as any)[key])
        : (item instanceof Model ? item.getKey() : (item as any).id);
      if (k != null) {
        dict[String(k)] = item;
      }
    }
    return dict;
  }

  /**
   * Return only models with keys matching the given IDs
   */
  only(ids: any[]): Collection<T> {
    const idSet = new Set(ids.map(String));
    return Collection.make(
      this.filter((item: any) => {
        const k = item instanceof Model ? item.getKey() : item.id;
        return idSet.has(String(k));
      })
    );
  }

  /**
   * Return all models except those with keys matching the given IDs
   */
  except(ids: any[]): Collection<T> {
    const idSet = new Set(ids.map(String));
    return Collection.make(
      this.filter((item: any) => {
        const k = item instanceof Model ? item.getKey() : item.id;
        return !idSet.has(String(k));
      })
    );
  }

  /**
   * Map each item into a new class
   */
  mapInto<U>(classType: new (item: T) => U): Collection<U> {
    const items = Array.from(this).map(item => new classType(item));
    return Collection.make(items) as unknown as Collection<U>;
  }
}
