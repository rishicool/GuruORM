import { describe, it, expect } from '@jest/globals';
import { Expression, raw } from '../../../src/Query/Expression';

describe('Query / Expression', () => {

  describe('constructor', () => {
    it('stores a string value', () => {
      const expr = new Expression('COUNT(*)');
      expect(expr.getValue()).toBe('COUNT(*)');
    });

    it('stores a numeric value', () => {
      const expr = new Expression(100);
      expect(expr.getValue()).toBe(100);
    });

    it('stores null', () => {
      const expr = new Expression(null);
      expect(expr.getValue()).toBeNull();
    });

    it('stores undefined', () => {
      const expr = new Expression(undefined);
      expect(expr.getValue()).toBeUndefined();
    });
  });

  describe('getValue', () => {
    it('returns the original value unchanged', () => {
      const obj = { foo: 'bar' };
      const expr = new Expression(obj);
      expect(expr.getValue()).toBe(obj);
    });
  });

  describe('toString', () => {
    it('converts string value', () => {
      expect(new Expression('SUM(total)').toString()).toBe('SUM(total)');
    });

    it('converts numeric value', () => {
      expect(new Expression(42).toString()).toBe('42');
    });

    it('converts null to "null"', () => {
      expect(new Expression(null).toString()).toBe('null');
    });
  });

  describe('raw() helper', () => {
    it('returns an Expression instance', () => {
      const expr = raw('NOW()');
      expect(expr).toBeInstanceOf(Expression);
    });

    it('wraps the provided value', () => {
      expect(raw('CURRENT_TIMESTAMP').getValue()).toBe('CURRENT_TIMESTAMP');
    });
  });
});
