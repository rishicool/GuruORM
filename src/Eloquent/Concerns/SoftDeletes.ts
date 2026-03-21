import { Model } from '../Model';
import { Builder as EloquentBuilder } from '../Builder';

// Constructor type for mixin pattern
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * SoftDeletes mixin function.
 * Composable with other mixins: `class User extends SoftDeletes(HasUuids(Model)) {}`
 */
export function SoftDeletes<TBase extends Constructor>(Base: TBase) {
  class SoftDeleteMixin extends (Base as unknown as Constructor<Model>) {
    static DELETED_AT = 'deleted_at';
    protected forceDeleting = false;
    private static _suppressionStack = 0;

    newQuery(): EloquentBuilder {
      const query = super.newQuery() as EloquentBuilder;
      query.whereNull(this.getDeletedAtColumn());
      return query;
    }

    newQueryWithoutScopes(): EloquentBuilder {
      return super.newQuery() as EloquentBuilder;
    }

    trashed(): boolean {
      return this.getAttribute(this.getDeletedAtColumn()) !== null;
    }

    async restore(): Promise<boolean> {
      if (!this.trashed()) return true;
      if (await (this as any).fireModelEvent('restoring') === false) return false;
      const column = this.getDeletedAtColumn();
      this.setAttribute(column, null);
      const query = this.newQueryWithoutScopes();
      await query.where((this as any).primaryKey, (this as any).getKey()).update({ [column]: null });
      (this as any).syncOriginal();
      await (this as any).fireModelEvent('restored', false);
      return true;
    }

    async restoreQuietly(): Promise<boolean> {
      const Ctor = this.constructor as any;
      Ctor._suppressionStack = (Ctor._suppressionStack || 0) + 1;
      try {
        return await this.restore();
      } finally {
        Ctor._suppressionStack--;
      }
    }

    static isEventsSuppressed(): boolean {
      return (this._suppressionStack || 0) > 0;
    }

    async forceDelete(): Promise<boolean> {
      this.forceDeleting = true;
      try {
        return await (this as any).delete();
      } finally {
        this.forceDeleting = false;
      }
    }

    protected async performDeleteOnModel(): Promise<boolean> {
      if (this.forceDeleting) {
        const query = this.newQueryWithoutScopes().where((this as any).primaryKey, (this as any).getKey());
        await query.delete();
        (this as any).exists = false;
        await (this as any).fireModelEvent('deleted', false);
        return true;
      }
      await this.runSoftDelete();
      return true;
    }

    protected async runSoftDelete(): Promise<void> {
      const query = this.newQueryWithoutScopes();
      const time = new Date();
      const column = this.getDeletedAtColumn();
      this.setAttribute(column, time);
      await query.where((this as any).primaryKey, (this as any).getKey()).update({ [column]: time });
      (this as any).syncOriginalAttribute(column);
    }

    getDeletedAtColumn(): string {
      return (this.constructor as any).DELETED_AT || 'deleted_at';
    }

    getQualifiedDeletedAtColumn(): string {
      const table = (this as any).table || `${this.constructor.name.toLowerCase()}s`;
      return `${table}.${this.getDeletedAtColumn()}`;
    }

    static withTrashed(this: any): any {
      const instance = new this();
      return instance.newQueryWithoutScopes();
    }

    static onlyTrashed(this: any): any {
      const instance = new this();
      return instance.newQueryWithoutScopes().whereNotNull(instance.getDeletedAtColumn());
    }
  }

  return SoftDeleteMixin as unknown as TBase & {
    new (...args: any[]): {
      trashed(): boolean;
      restore(): Promise<boolean>;
      restoreQuietly(): Promise<boolean>;
      forceDelete(): Promise<boolean>;
      getDeletedAtColumn(): string;
      getQualifiedDeletedAtColumn(): string;
      newQueryWithoutScopes(): EloquentBuilder;
    };
    DELETED_AT: string;
    isEventsSuppressed(): boolean;
    withTrashed(): any;
    onlyTrashed(): any;
  };
}

/**
 * Model with soft delete support (class-based, backward compatible).
 * For composition with other concerns, use the SoftDeletes() mixin instead:
 *   class User extends SoftDeletes(HasUuids(Model)) {}
 */
export class SoftDeleteModel extends Model {
  static DELETED_AT = 'deleted_at';
  protected forceDeleting = false;
  private static _suppressionStack = 0;

  newQuery(): EloquentBuilder {
    const query = super.newQuery();
    query.whereNull(this.getDeletedAtColumn());
    return query;
  }

  newQueryWithoutScopes(): EloquentBuilder {
    return super.newQuery();
  }

  trashed(): boolean {
    return this.getAttribute(this.getDeletedAtColumn()) !== null;
  }

  async restore(): Promise<boolean> {
    if (!this.trashed()) return true;
    if (await this.fireModelEvent('restoring') === false) return false;
    const column = this.getDeletedAtColumn();
    this.setAttribute(column, null);
    const query = this.newQueryWithoutScopes();
    await query.where(this.primaryKey, this.getKey()).update({ [column]: null });
    this.syncOriginal();
    await this.fireModelEvent('restored', false);
    return true;
  }

  async restoreQuietly(): Promise<boolean> {
    return (this.constructor as typeof SoftDeleteModel).withoutEvents(() => this.restore());
  }

  static isEventsSuppressed(): boolean {
    return this._suppressionStack > 0;
  }

  async forceDelete(): Promise<boolean> {
    this.forceDeleting = true;
    try {
      return await this.delete();
    } finally {
      this.forceDeleting = false;
    }
  }

  protected async performDeleteOnModel(): Promise<boolean> {
    if (this.forceDeleting) {
      const query = this.newQueryWithoutScopes().where(this.primaryKey, this.getKey());
      await query.delete();
      this.exists = false;
      await this.fireModelEvent('deleted', false);
      return true;
    }
    await this.runSoftDelete();
    return true;
  }

  protected async runSoftDelete(): Promise<void> {
    const query = this.newQueryWithoutScopes();
    const time = new Date();
    const column = this.getDeletedAtColumn();
    this.setAttribute(column, time);
    await query.where(this.primaryKey, this.getKey()).update({ [column]: time });
    this.syncOriginalAttribute(column);
  }

  getDeletedAtColumn(): string {
    return (this.constructor as typeof SoftDeleteModel).DELETED_AT;
  }

  getQualifiedDeletedAtColumn(): string {
    const table = this.table || `${this.constructor.name.toLowerCase()}s`;
    return `${table}.${this.getDeletedAtColumn()}`;
  }

  static withTrashed<T extends SoftDeleteModel>(this: new () => T): any {
    const instance = new this();
    return instance.newQueryWithoutScopes();
  }

  static onlyTrashed<T extends SoftDeleteModel>(this: new () => T): any {
    const instance = new this();
    return instance.newQueryWithoutScopes().whereNotNull(instance.getDeletedAtColumn());
  }
}
