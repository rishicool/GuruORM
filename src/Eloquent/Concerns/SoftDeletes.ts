import { Model } from '../Model';
import { Builder as EloquentBuilder } from '../Builder';

/**
 * Model with soft delete support
 * Extend this class to add soft delete functionality to your models
 */
export class SoftDeleteModel extends Model {
  /**
   * The name of the "deleted at" column
   */
  static DELETED_AT = 'deleted_at';

  /**
   * Indicates if the model is currently force deleting
   */
  protected forceDeleting = false;

  /**
   * Get a new query builder for the model's table
   * Automatically excludes soft deleted records
   */
  newQuery(): EloquentBuilder {
    const query = super.newQuery();
    
    // Automatically filter out soft deleted records
    query.whereNull(this.getDeletedAtColumn());
    
    return query;
  }

  /**
   * Get a new query builder without soft delete scope
   */
  newQueryWithoutScopes(): EloquentBuilder {
    return super.newQuery();
  }

  /**
   * Determine if the model instance has been soft-deleted
   */
  trashed(): boolean {
    return this.getAttribute(this.getDeletedAtColumn()) !== null;
  }

  /**
   * Restore a soft-deleted model instance
   */
  async restore(): Promise<boolean> {
    // Only restore if the model has been soft-deleted
    if (!this.trashed()) {
      return true;
    }

    // Fire the restoring event
    if (await this.fireModelEvent('restoring') === false) {
      return false;
    }

    // Set the deleted_at column to null
    const column = this.getDeletedAtColumn();
    this.setAttribute(column, null);

    // Update directly without soft delete scope
    const query = this.newQueryWithoutScopes();
    await query.where(this.primaryKey, this.getKey()).update({
      [column]: null,
    });

    // Sync the change
    this.syncOriginal();

    // Fire the restored event
    await this.fireModelEvent('restored', false);

    return true;
  }

  /**
   * Restore a soft-deleted model instance without firing events
   */
  async restoreQuietly(): Promise<boolean> {
    // Temporarily disable events
    const originalEvents = (this.constructor as any).events;
    (this.constructor as any).events = [];
    
    const result = await this.restore();
    
    // Restore events
    (this.constructor as any).events = originalEvents;
    
    return result;
  }

  /**
   * Force a hard delete on a soft deleted model
   */
  async forceDelete(): Promise<boolean> {
    this.forceDeleting = true;

    try {
      return await this.delete();
    } finally {
      this.forceDeleting = false;
    }
  }

  /**
   * Perform the actual delete query
   */
  protected async performDeleteOnModel(): Promise<boolean> {
    if (this.forceDeleting) {
      // Hard delete - use query without soft delete scope
      const query = this.newQueryWithoutScopes().where(this.primaryKey, this.getKey());
      await query.delete();

      this.exists = false;

      // Fire the deleted event
      await this.fireModelEvent('deleted', false);

      return true;
    }

    // Soft delete - just update the deleted_at timestamp
    await this.runSoftDelete();
    return true;
  }

  /**
   * Perform the actual soft delete operation
   */
  protected async runSoftDelete(): Promise<void> {
    const query = this.newQueryWithoutScopes();
    
    const time = new Date();
    const column = this.getDeletedAtColumn();

    this.setAttribute(column, time);

    await query.where(this.primaryKey, this.getKey()).update({
      [column]: time,
    });

    this.syncOriginalAttribute(column);
  }

  /**
   * Get the name of the "deleted at" column
   */
  getDeletedAtColumn(): string {
    return (this.constructor as typeof SoftDeleteModel).DELETED_AT;
  }

  /**
   * Get the fully qualified "deleted at" column
   */
  getQualifiedDeletedAtColumn(): string {
    return `${this.table || this.constructor.name.toLowerCase()}s.${this.getDeletedAtColumn()}`;
  }

  /**
   * Get a new query builder that includes soft deleted models
   */
  static withTrashed<T extends SoftDeleteModel>(this: new () => T): any {
    const instance = new this();
    return instance.newQueryWithoutScopes();
  }

  /**
   * Get a new query builder that only includes soft deleted models
   */
  static onlyTrashed<T extends SoftDeleteModel>(this: new () => T): any {
    const instance = new this();
    return instance.newQueryWithoutScopes().whereNotNull(instance.getDeletedAtColumn());
  }
}
