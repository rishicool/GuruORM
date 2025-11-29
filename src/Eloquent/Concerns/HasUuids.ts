import { Model } from '../Model';

/**
 * Model with UUID support
 */
export class UuidModel extends Model {
  protected keyType = 'string';
  protected incrementing = false;

  /**
   * Generate a UUID
   */
  protected generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Model with ULID support
 */
export class UlidModel extends Model {
  protected keyType = 'string';
  protected incrementing = false;

  /**
   * Generate a ULID
   */
  protected generateUlid(): string {
    const timestamp = Date.now();
    const randomness = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    
    return `${timestamp.toString(36)}${randomness}`.toUpperCase().substring(0, 26);
  }
}

// Export empty traits for compatibility
export class HasUuids {}
export class HasUlids {}

