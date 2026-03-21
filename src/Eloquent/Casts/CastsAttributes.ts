import { Model } from '../Model';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

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
 * Encrypted cast - provides real AES-256-GCM encryption at rest.
 *
 * Requires the APP_KEY environment variable to be set (minimum 16 characters).
 * The key is derived via scrypt, and each encrypted value contains a unique IV
 * and authentication tag, making identical plaintexts produce different ciphertexts.
 *
 * Storage format: hex(iv):hex(authTag):hex(ciphertext)
 */
export class EncryptedCast implements CastsAttributes {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Derive a 32-byte encryption key from the application key via scrypt.
   * Throws immediately if APP_KEY is missing — this is intentional:
   * using EncryptedCast without a key must fail loudly, never silently.
   */
  private static deriveKey(): Buffer {
    const appKey = process.env.APP_KEY;
    if (!appKey || appKey.length < 16) {
      throw new Error(
        'EncryptedCast requires the APP_KEY environment variable to be set ' +
        '(minimum 16 characters). Set it in your .env file or environment.'
      );
    }
    return scryptSync(appKey, 'guruorm-encrypted-cast', 32);
  }

  get(model: Model, key: string, value: any, attributes: Record<string, any>): any {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value);

    // Validate storage format: iv:authTag:ciphertext (all hex)
    const parts = stringValue.split(':');
    if (parts.length !== 3) {
      throw new Error(
        `EncryptedCast: invalid encrypted value for attribute "${key}". ` +
        'Expected format iv:authTag:ciphertext. ' +
        'If this data was encoded with a previous version, use LegacyEncryptedCast to migrate.'
      );
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;

    try {
      const derivedKey = EncryptedCast.deriveKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const ciphertext = Buffer.from(ciphertextHex, 'hex');

      const decipher = createDecipheriv(EncryptedCast.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error: any) {
      if (error.message.includes('APP_KEY') || error.message.includes('EncryptedCast:')) {
        throw error;
      }
      throw new Error(
        `EncryptedCast: failed to decrypt attribute "${key}". ` +
        'The APP_KEY may have changed, or the data may be corrupted.'
      );
    }
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const derivedKey = EncryptedCast.deriveKey();
    const iv = randomBytes(EncryptedCast.IV_LENGTH);

    const cipher = createCipheriv(EncryptedCast.ALGORITHM, derivedKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(value), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext — all hex-encoded
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }
}

/**
 * Legacy encrypted cast — base64 decode/encode only.
 *
 * This exists solely for backward compatibility with data that was stored
 * using the old EncryptedCast (which was base64, not actual encryption).
 * Use this temporarily while migrating existing data to the real EncryptedCast,
 * then remove it.
 *
 * @deprecated Use EncryptedCast instead. This provides NO security.
 */
export class LegacyEncryptedCast implements CastsAttributes {
  get(model: Model, key: string, value: any, attributes: Record<string, any>): any {
    if (value === null || value === undefined) {
      return null;
    }
    try {
      return Buffer.from(String(value), 'base64').toString('utf8');
    } catch (e) {
      return value;
    }
  }

  set(model: Model, key: string, value: any, attributes: Record<string, any>): string | null {
    if (value === null || value === undefined) {
      return null;
    }
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
