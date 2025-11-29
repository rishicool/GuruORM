import { Builder } from './Builder';
import { Model } from './Model';

/**
 * Scope interface
 */
export interface Scope {
  /**
   * Apply the scope to a given Eloquent query builder
   */
  apply(builder: Builder, model: Model): void;
}

/**
 * Soft delete scope
 */
export class SoftDeletingScope implements Scope {
  /**
   * All of the extensions to be added to the builder
   */
  protected extensions = [
    'Restore',
    'RestoreQuietly',
    'WithTrashed',
    'WithoutTrashed',
    'OnlyTrashed',
  ];

  /**
   * Apply the scope to a given Eloquent query builder
   */
  apply(builder: Builder, model: Model): void {
    builder.whereNull((model as any).getDeletedAtColumn());
  }

  /**
   * Extend the query builder with the needed functions
   */
  extend(builder: Builder): void {
    for (const extension of this.extensions) {
      const methodName = `add${extension}` as keyof SoftDeletingScope;
      const method = this[methodName];
      if (typeof method === 'function') {
        (method as Function).call(this, builder);
      }
    }
  }

  /**
   * Get the "deleted at" column for the builder
   */
  protected getDeletedAtColumn(builder: Builder): string {
    const model = builder.getModel();
    return (model as any).getDeletedAtColumn 
      ? (model as any).getDeletedAtColumn()
      : 'deleted_at';
  }

  /**
   * Add the restore extension to the builder
   */
  protected addRestore(builder: Builder): void {
    (builder as any).restore = async function() {
      return this.update({ 
        [this.getDeletedAtColumn()]: null 
      });
    };
  }

  /**
   * Add the restore quietly extension to the builder
   */
  protected addRestoreQuietly(builder: Builder): void {
    (builder as any).restoreQuietly = async function() {
      return this.restore();
    };
  }

  /**
   * Add the with-trashed extension to the builder
   */
  protected addWithTrashed(builder: Builder): void {
    (builder as any).withTrashed = function(withTrashed = true) {
      if (!withTrashed) {
        return this.withoutTrashed();
      }

      return this.withoutGlobalScope('SoftDeletingScope');
    };
  }

  /**
   * Add the without-trashed extension to the builder
   */
  protected addWithoutTrashed(builder: Builder): void {
    (builder as any).withoutTrashed = function() {
      const model = this.getModel();
      
      this.withoutGlobalScope('SoftDeletingScope')
        .whereNull(model.getDeletedAtColumn());

      return this;
    };
  }

  /**
   * Add the only-trashed extension to the builder
   */
  protected addOnlyTrashed(builder: Builder): void {
    (builder as any).onlyTrashed = function() {
      const model = this.getModel();
      
      this.withoutGlobalScope('SoftDeletingScope')
        .whereNotNull(model.getDeletedAtColumn());

      return this;
    };
  }
}

/**
 * Base class for models with scopes
 */
export class HasGlobalScopes {
  /**
   * The array of global scopes on the model
   */
  protected static globalScopes: Map<string, Map<string, Scope>> = new Map();

  /**
   * Register a new global scope on the model
   */
  static addGlobalScope(scope: Scope | string, implementation?: Scope): typeof HasGlobalScopes {
    if (typeof scope === 'string' && implementation) {
      if (!this.globalScopes.has(this.name)) {
        this.globalScopes.set(this.name, new Map());
      }
      
      this.globalScopes.get(this.name)!.set(scope, implementation);
      return this;
    }

    if (typeof scope !== 'string') {
      const scopeName = scope.constructor.name;
      
      if (!this.globalScopes.has(this.name)) {
        this.globalScopes.set(this.name, new Map());
      }
      
      this.globalScopes.get(this.name)!.set(scopeName, scope);
    }

    return this;
  }

  /**
   * Determine if a model has a global scope
   */
  static hasGlobalScope(scope: Scope | string): boolean {
    const scopeName = typeof scope === 'string' ? scope : scope.constructor.name;
    return this.globalScopes.get(this.name)?.has(scopeName) ?? false;
  }

  /**
   * Get a global scope registered with the model
   */
  static getGlobalScope(scope: Scope | string): Scope | undefined {
    const scopeName = typeof scope === 'string' ? scope : scope.constructor.name;
    return this.globalScopes.get(this.name)?.get(scopeName);
  }

  /**
   * Get the global scopes for this class instance
   */
  getGlobalScopes(): Map<string, Scope> {
    const className = this.constructor.name;
    return (this.constructor as typeof HasGlobalScopes).globalScopes.get(className) 
      ?? new Map();
  }
}
