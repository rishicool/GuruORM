// @ts-nocheck - Helper functions with intentional type flexibility
/**
 * Helper functions - inspired by Laravel's helper functions
 */

/**
 * Determine if a value is a plain object
 */
export function isPlainObject(value: any): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Get the class name of the given object
 */
export function getClassName(obj: any): string {
  return obj.constructor.name;
}

/**
 * Transform a string to snake_case
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Transform a string to camelCase
 */
export function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transform a string to StudlyCase (PascalCase)
 */
export function studlyCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Get the value of a nested object property using "dot" notation
 */
export function dataGet(obj: any, path: string, defaultValue: any = undefined): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }

    result = result[key];
  }

  return result ?? defaultValue;
}

/**
 * Set a value in a nested object using "dot" notation
 */
export function dataSet(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }

    current = current[key];
  }

  current[lastKey] = value;
}

/**
 * Return the default value of the given value
 */
export function value<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val;
}

/**
 * Get the first element of an array
 */
export function head<T>(array: T[]): T | undefined {
  return array[0];
}

/**
 * Get the last element of an array
 */
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

/**
 * Flatten a multi-dimensional array into a single level
 */
export function flatten<T>(array: any[], depth = Infinity): T[] {
  return array.flat(depth) as T[];
}

/**
 * Create an array of values by running each element through a callback
 */
export function collect<T>(items: T[]): import('./Collection').Collection<T> {
  const { Collection } = require('./Collection');
  return new Collection<T>(...items);
}

/**
 * Tap the given value and return it
 */
export function tap<T>(value: T, callback: (value: T) => void): T {
  callback(value);
  return value;
}

/**
 * Call the given callback with the given value then return the value
 */
export function withValue<T>(value: T, callback?: (value: T) => any): any {
  if (callback) {
    return callback(value);
  }

  return value;
}

/**
 * Determine if the given value is blank
 */
export function blank(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Determine if the given value is "filled"
 */
export function filled(value: any): boolean {
  return !blank(value);
}

/**
 * Throw the given exception if the given condition is true
 */
export function throwIf(condition: boolean, error: Error | string): void {
  if (condition) {
    throw typeof error === 'string' ? new Error(error) : error;
  }
}

/**
 * Throw the given exception unless the given condition is true
 */
export function throwUnless(condition: boolean, error: Error | string): void {
  throwIf(!condition, error);
}

/**
 * Retry a callback a given number of times
 */
export async function retry<T>(
  times: number,
  callback: (attempt: number) => Promise<T>,
  sleep = 0
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= times; attempt += 1) {
    try {
      return await callback(attempt);
    } catch (error) {
      lastError = error as Error;

      if (attempt < times && sleep > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, sleep);
        });
      }
    }
  }

  throw lastError;
}
