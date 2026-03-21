import { SoftDeletingScope, HasGlobalScopes, Scope } from '../../../src/Eloquent/Scope';

describe('Eloquent / Scope', () => {
  describe('SoftDeletingScope', () => {
    let scope: SoftDeletingScope;

    beforeEach(() => {
      scope = new SoftDeletingScope();
    });

    test('apply() adds whereNull on deleted_at column', () => {
      const whereNull = jest.fn();
      const model = { getDeletedAtColumn: () => 'deleted_at' } as any;
      const builder = { whereNull } as any;

      scope.apply(builder, model);
      expect(whereNull).toHaveBeenCalledWith('deleted_at');
    });

    test('extend() adds extensions to builder', () => {
      const builder = {} as any;
      scope.extend(builder);

      expect(typeof builder.restore).toBe('function');
      expect(typeof builder.restoreQuietly).toBe('function');
      expect(typeof builder.withTrashed).toBe('function');
      expect(typeof builder.withoutTrashed).toBe('function');
      expect(typeof builder.onlyTrashed).toBe('function');
    });

    test('withTrashed extension calls withoutGlobalScope', () => {
      const builder: any = {};
      scope.extend(builder);

      const withoutGlobalScope = jest.fn().mockReturnThis();
      const ctx = { withoutGlobalScope, withoutTrashed: jest.fn() };
      const result = builder.withTrashed.call(ctx);
      expect(withoutGlobalScope).toHaveBeenCalledWith('SoftDeletingScope');
    });

    test('withTrashed(false) calls withoutTrashed', () => {
      const builder: any = {};
      scope.extend(builder);

      const withoutTrashed = jest.fn().mockReturnValue('result');
      const ctx = { withoutTrashed };
      builder.withTrashed.call(ctx, false);
      expect(withoutTrashed).toHaveBeenCalled();
    });

    test('withoutTrashed extension removes scope and adds whereNull', () => {
      const builder: any = {};
      scope.extend(builder);

      const whereNull = jest.fn().mockReturnThis();
      const withoutGlobalScope = jest.fn().mockReturnValue({ whereNull });
      const model = { getDeletedAtColumn: () => 'deleted_at' };
      const ctx = { withoutGlobalScope, getModel: () => model };

      builder.withoutTrashed.call(ctx);
      expect(withoutGlobalScope).toHaveBeenCalledWith('SoftDeletingScope');
      expect(whereNull).toHaveBeenCalledWith('deleted_at');
    });

    test('onlyTrashed extension removes scope and adds whereNotNull', () => {
      const builder: any = {};
      scope.extend(builder);

      const whereNotNull = jest.fn().mockReturnThis();
      const withoutGlobalScope = jest.fn().mockReturnValue({ whereNotNull });
      const model = { getDeletedAtColumn: () => 'deleted_at' };
      const ctx = { withoutGlobalScope, getModel: () => model };

      builder.onlyTrashed.call(ctx);
      expect(withoutGlobalScope).toHaveBeenCalledWith('SoftDeletingScope');
      expect(whereNotNull).toHaveBeenCalledWith('deleted_at');
    });
  });

  describe('HasGlobalScopes', () => {
    class TestScopedModel extends HasGlobalScopes {}
    class TestScope implements Scope {
      apply(builder: any, model: any): void {}
    }

    afterEach(() => {
      // Clean up registered scopes
      (HasGlobalScopes as any).globalScopes = new Map();
    });

    test('addGlobalScope with string name + implementation', () => {
      const s = new TestScope();
      TestScopedModel.addGlobalScope('active', s);
      expect(TestScopedModel.hasGlobalScope('active')).toBe(true);
      expect(TestScopedModel.getGlobalScope('active')).toBe(s);
    });

    test('addGlobalScope with scope instance (uses constructor name)', () => {
      const s = new TestScope();
      TestScopedModel.addGlobalScope(s);
      expect(TestScopedModel.hasGlobalScope('TestScope')).toBe(true);
    });

    test('hasGlobalScope returns false when not registered', () => {
      expect(TestScopedModel.hasGlobalScope('Missing')).toBe(false);
    });

    test('getGlobalScope returns undefined when not registered', () => {
      expect(TestScopedModel.getGlobalScope('Missing')).toBeUndefined();
    });

    test('getGlobalScopes instance method returns scopes for class', () => {
      const s = new TestScope();
      TestScopedModel.addGlobalScope('test', s);
      const instance = new TestScopedModel();
      const scopes = instance.getGlobalScopes();
      expect(scopes.has('test')).toBe(true);
    });

    test('getGlobalScopes returns empty map when no scopes', () => {
      class EmptyModel extends HasGlobalScopes {}
      const instance = new EmptyModel();
      expect(instance.getGlobalScopes().size).toBe(0);
    });
  });
});
