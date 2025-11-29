import { Model } from '../Model';

/**
 * Interface for custom attribute casts
 */
export interface CastsAttributes {
  /**
   * Transform the attribute from the underlying model values
   */
  get(model: Model, key: string, value: any, attributes: Record<string, any>): any;

  /**
   * Transform the attribute to its underlying model values
   */
  set(model: Model, key: string, value: any, attributes: Record<string, any>): any;
}

/**
 * Array cast - converts JSON to array
 */
export class ArrayCast implements CastsAttributes {
  get(model: Model, key: string, value: any, attributes: Record<string, any>): any[] {
    if (value === null || value === undefined) {
      return [];
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }

    return Array.isArray(value) ? value : [];
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return JSON.stringify(value);
  }
}

/**
 * JSON cast - converts JSON to object
 */
export class JsonCast implements CastsAttributes {
  get(model: Model, key: string, value: any, attributes: Record<string, any>): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }

    return value;
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return JSON.stringify(value);
  }
}

/**
 * Encrypted cast - encrypts/decrypts values
 */
export class EncryptedCast implements CastsAttributes {
  get(model: Model, key: string, value: any, attributes: Record<string, any>): any {
    if (value === null || value === undefined) {
      return null;
    }

    // This is a placeholder - you'd need to implement actual encryption
    // using something like crypto module
    try {
      return Buffer.from(value, 'base64').toString('utf8');
    } catch (e) {
      return value;
    }
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    // This is a placeholder - you'd need to implement actual encryption
    return Buffer.from(String(value)).toString('base64');
  }
}

/**
 * AsCollection cast - converts array to Collection
 */
export class AsCollectionCast implements CastsAttributes {
  get(model: Model, key: string, value: any, attributes: Record<string, any>): any {
    const { Collection } = require('../../Support/Collection');
    
    if (value === null || value === undefined) {
      return new Collection();
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return new Collection(...(Array.isArray(parsed) ? parsed : [parsed]));
      } catch (e) {
        return new Collection();
      }
    }

    if (Array.isArray(value)) {
      return new Collection(...value);
    }

    return new Collection(value);
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const { Collection } = require('../../Support/Collection');
    
    if (value instanceof Collection) {
      return JSON.stringify(value.toArray());
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    return JSON.stringify([value]);
  }
}

/**
 * AsStringable cast - converts to string wrapper
 */
export class AsStringableCast implements CastsAttributes {
  get(model: Model, key: string, value: any, attributes: Record<string, any>): string {
    return String(value || '');
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  }
}
