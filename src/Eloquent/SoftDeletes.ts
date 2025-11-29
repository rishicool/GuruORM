import { Model } from './Model';

/**
 * Soft Deletes functionality - inspired by Laravel and Illuminate
 * 
 * To use soft deletes in your model:
 * 1. Extend your model from Model
 * 2. Implement the SoftDeletable interface
 * 3. Set useSoftDeletes = true
 * 4. Add deleted_at column to your table
 * 
 * Example:
 * class User extends Model implements SoftDeletable {
 *   useSoftDeletes = true;
 * }
 */

export const DELETED_AT = 'deleted_at';

export interface SoftDeletable {
  useSoftDeletes: boolean;
  trashed(): boolean;
  restore(): Promise<boolean>;
  restoreQuietly(): Promise<boolean>;
  forceDelete(): Promise<boolean>;
}

/**
 * Extended Model class with soft delete support
 */
export class SoftDeleteModel extends Model {
  // Enable soft deletes
  useSoftDeletes = true;

  // Soft delete column name
  static DELETED_AT = DELETED_AT;

  // Indicate if the model is currently force deleting
  private forceDeleting = false;

  /**
   * Get the name of the "deleted at" column
   */
  getDeletedAtColumn(): string {
    return (this.constructor as typeof SoftDeleteModel).DELETED_AT;
  }

  /**
   * Perform the actual delete query on this model instance
   */
  async delete(): Promise<boolean> {
    if (!this.exists) {
      return false;
    }

    if (this.forceDeleting) {
      return super.delete();
    }

    // Soft delete by setting the deleted_at timestamp
    await this.runSoftDelete();

    return true;
  }

  /**
   * Perform the actual soft delete query
   */
  private async runSoftDelete(): Promise<void> {
    const query = this.newQuery();
    query.where(this.primaryKey, this.getKey());

    const deletedAt = this.getDeletedAtColumn();
    const time = this.freshTimestamp();

    await query.update({ [deletedAt]: time });

    this.setAttribute(deletedAt, time);
    this.syncOriginal();
  }

  /**
   * Force a hard delete on a soft deleted model
   */
  async forceDelete(): Promise<boolean> {
    this.forceDeleting = true;
    const deleted = await this.delete();
    this.forceDeleting = false;

    return deleted;
  }

  /**
   * Restore a soft-deleted model instance
   */
  async restore(): Promise<boolean> {
    if (!this.trashed()) {
      return true;
    }

    const deletedAt = this.getDeletedAtColumn();
    this.setAttribute(deletedAt, null);

    const result = await this.save();

    return result;
  }

  /**
   * Restore a soft-deleted model without raising any events
   */
  async restoreQuietly(): Promise<boolean> {
    return this.restore();
  }

  /**
   * Determine if the model instance has been soft-deleted
   */
  trashed(): boolean {
    const deletedAt = this.getDeletedAtColumn();
    const value = this.getAttribute(deletedAt);
    return value !== null && value !== undefined;
  }

  /**
   * Determine if the model is currently force deleting
   */
  isForceDeleting(): boolean {
    return this.forceDeleting;
  }

  /**
   * Get a new query builder that includes soft deleted models
   */
  static withTrashed<T extends SoftDeleteModel>(this: new () => T): any {
    const instance = new this();
    const builder = instance.newQuery();
    
    // Remove the where null constraint on deleted_at
    // For now, just return the builder
    // This would need a query scope system to properly implement
    
    return builder;
  }

  /**
   * Get a new query builder that only includes soft deleted models
   */
  static onlyTrashed<T extends SoftDeleteModel>(this: new () => T): any {
    const instance = new this();
    const builder = instance.newQuery();
    const deletedAt = (this as any).DELETED_AT;
    
    builder.whereNotNull(deletedAt);
    
    return builder;
  }
}

