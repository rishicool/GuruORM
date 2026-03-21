import {
  isPlainObject,
  getClassName,
  snakeCase,
  camelCase,
  studlyCase,
  dataGet,
  dataSet,
  value,
  head,
  last,
  flatten,
  collect,
  tap,
  withValue,
  blank,
  filled,
  throwIf,
  throwUnless,
  retry,
} from '../../../src/Support/helpers';

describe('Support / helpers', () => {
  describe('isPlainObject', () => {
    test('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
    });

    test('returns false for non-plain values', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(42)).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });
  });

  describe('getClassName', () => {
    test('returns constructor name', () => {
      class Foo {}
      expect(getClassName(new Foo())).toBe('Foo');
      expect(getClassName({})).toBe('Object');
      expect(getClassName([])).toBe('Array');
    });
  });

  describe('snakeCase', () => {
    test('converts camelCase', () => {
      expect(snakeCase('fooBar')).toBe('foo_bar');
      expect(snakeCase('fooBarBaz')).toBe('foo_bar_baz');
    });

    test('converts PascalCase', () => {
      expect(snakeCase('FooBar')).toBe('foo_bar');
    });

    test('handles consecutive uppercase', () => {
      expect(snakeCase('HTMLParser')).toBe('html_parser');
    });

    test('handles already snake_case', () => {
      expect(snakeCase('foo_bar')).toBe('foo_bar');
    });
  });

  describe('camelCase', () => {
    test('converts snake_case', () => {
      expect(camelCase('foo_bar')).toBe('fooBar');
      expect(camelCase('foo_bar_baz')).toBe('fooBarBaz');
    });

    test('keeps already camelCase', () => {
      expect(camelCase('fooBar')).toBe('fooBar');
    });
  });

  describe('studlyCase', () => {
    test('converts snake_case to PascalCase', () => {
      expect(studlyCase('foo_bar')).toBe('FooBar');
    });

    test('converts camelCase to PascalCase', () => {
      expect(studlyCase('fooBar')).toBe('FooBar');
    });
  });

  describe('dataGet', () => {
    test('gets nested value with dot notation', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(dataGet(obj, 'a.b.c')).toBe(42);
    });

    test('returns default when path not found', () => {
      expect(dataGet({}, 'a.b', 'default')).toBe('default');
    });

    test('returns default for null intermediate', () => {
      expect(dataGet({ a: null }, 'a.b', 'fallback')).toBe('fallback');
    });

    test('gets top-level value', () => {
      expect(dataGet({ name: 'test' }, 'name')).toBe('test');
    });
  });

  describe('dataSet', () => {
    test('sets nested value with dot notation', () => {
      const obj: any = {};
      dataSet(obj, 'a.b.c', 42);
      expect(obj.a.b.c).toBe(42);
    });

    test('sets top-level value', () => {
      const obj: any = {};
      dataSet(obj, 'name', 'test');
      expect(obj.name).toBe('test');
    });

    test('overwrites existing value', () => {
      const obj: any = { a: { b: 1 } };
      dataSet(obj, 'a.b', 2);
      expect(obj.a.b).toBe(2);
    });

    test('creates intermediate objects', () => {
      const obj: any = { a: 'not-an-object' };
      dataSet(obj, 'a.b', 1);
      expect(obj.a.b).toBe(1);
    });
  });

  describe('value', () => {
    test('returns raw value', () => {
      expect(value(42)).toBe(42);
      expect(value('hello')).toBe('hello');
    });

    test('evaluates callback', () => {
      expect(value(() => 42)).toBe(42);
    });
  });

  describe('head', () => {
    test('returns first element', () => {
      expect(head([1, 2, 3])).toBe(1);
    });

    test('returns undefined for empty array', () => {
      expect(head([])).toBeUndefined();
    });
  });

  describe('last', () => {
    test('returns last element', () => {
      expect(last([1, 2, 3])).toBe(3);
    });

    test('returns undefined for empty array', () => {
      expect(last([])).toBeUndefined();
    });
  });

  describe('flatten', () => {
    test('flattens nested arrays', () => {
      expect(flatten([1, [2, [3]]])).toEqual([1, 2, 3]);
    });

    test('respects depth parameter', () => {
      expect(flatten([1, [2, [3]]], 1)).toEqual([1, 2, [3]]);
    });
  });

  describe('collect', () => {
    test('creates Collection from array', () => {
      const c = collect([1, 2, 3]);
      expect(c.count()).toBe(3);
      expect(c.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('tap', () => {
    test('calls callback and returns original value', () => {
      const cb = jest.fn();
      const result = tap(42, cb);
      expect(result).toBe(42);
      expect(cb).toHaveBeenCalledWith(42);
    });
  });

  describe('withValue', () => {
    test('returns callback result when callback provided', () => {
      expect(withValue(5, (v) => v * 2)).toBe(10);
    });

    test('returns value when no callback', () => {
      expect(withValue(5)).toBe(5);
    });
  });

  describe('blank', () => {
    test('null and undefined are blank', () => {
      expect(blank(null)).toBe(true);
      expect(blank(undefined)).toBe(true);
    });

    test('empty string is blank', () => {
      expect(blank('')).toBe(true);
      expect(blank('  ')).toBe(true);
    });

    test('empty array is blank', () => {
      expect(blank([])).toBe(true);
    });

    test('empty object is blank', () => {
      expect(blank({})).toBe(true);
    });

    test('non-empty values are not blank', () => {
      expect(blank('hello')).toBe(false);
      expect(blank([1])).toBe(false);
      expect(blank({ a: 1 })).toBe(false);
      expect(blank(0)).toBe(false);
      expect(blank(false)).toBe(false);
    });
  });

  describe('filled', () => {
    test('inverse of blank', () => {
      expect(filled(null)).toBe(false);
      expect(filled('hello')).toBe(true);
      expect(filled([])).toBe(false);
      expect(filled([1])).toBe(true);
    });
  });

  describe('throwIf', () => {
    test('throws when condition is true', () => {
      expect(() => throwIf(true, 'error')).toThrow('error');
      expect(() => throwIf(true, new TypeError('type err'))).toThrow(TypeError);
    });

    test('does not throw when condition is false', () => {
      expect(() => throwIf(false, 'error')).not.toThrow();
    });
  });

  describe('throwUnless', () => {
    test('throws when condition is false', () => {
      expect(() => throwUnless(false, 'error')).toThrow('error');
    });

    test('does not throw when condition is true', () => {
      expect(() => throwUnless(true, 'error')).not.toThrow();
    });
  });

  describe('retry', () => {
    test('succeeds on first attempt', async () => {
      const cb = jest.fn().mockResolvedValue('ok');
      const result = await retry(3, cb);
      expect(result).toBe('ok');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test('retries on failure', async () => {
      const cb = jest.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockResolvedValue('ok');
      const result = await retry(3, cb);
      expect(result).toBe('ok');
      expect(cb).toHaveBeenCalledTimes(2);
    });

    test('throws after all retries exhausted', async () => {
      const cb = jest.fn().mockRejectedValue(new Error('always fail'));
      await expect(retry(2, cb)).rejects.toThrow('always fail');
      expect(cb).toHaveBeenCalledTimes(2);
    });

    test('passes attempt number to callback', async () => {
      const cb = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');
      await retry(3, cb);
      expect(cb).toHaveBeenNthCalledWith(1, 1);
      expect(cb).toHaveBeenNthCalledWith(2, 2);
    });

    test('sleeps between retries', async () => {
      const cb = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');
      const start = Date.now();
      await retry(2, cb, 50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });
  });
});
