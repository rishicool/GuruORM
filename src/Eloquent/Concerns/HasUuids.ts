import { Model } from '../Model';
import { randomUUID, randomBytes } from 'crypto';

// Constructor type for mixin pattern
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * HasUuids mixin function.
 * Composable: `class User extends HasUuids(SoftDeletes(Model)) {}`
 */
export function HasUuids<TBase extends Constructor>(Base: TBase) {
  class UuidMixin extends (Base as unknown as Constructor<Model>) {
    protected keyType = 'string';
    protected incrementing = false;

    protected generateUuid(): string {
      return randomUUID();
    }
  }
  return UuidMixin as unknown as TBase & (new (...args: any[]) => { generateUuid(): string });
}

/**
 * HasUlids mixin function.
 * Composable: `class Post extends HasUlids(SoftDeletes(Model)) {}`
 */
export function HasUlids<TBase extends Constructor>(Base: TBase) {
  class UlidMixin extends (Base as unknown as Constructor<Model>) {
    protected keyType = 'string';
    protected incrementing = false;

    protected generateUlid(): string {
      const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      const timestamp = Date.now();

      let ts = '';
      let t = timestamp;
      for (let i = 9; i >= 0; i--) {
        ts = CROCKFORD[t & 31] + ts;
        t = Math.floor(t / 32);
      }

      const bytes = randomBytes(10);
      let rand = '';
      for (let i = 0; i < 10; i++) {
        rand += CROCKFORD[bytes[i] & 31];
        if (i < 9) {
          rand += CROCKFORD[((bytes[i] >> 5) | ((bytes[i + 1] & 3) << 3)) & 31];
        } else {
          rand += CROCKFORD[(bytes[i] >> 5) & 31];
        }
      }
      rand = rand.substring(0, 16);

      return ts + rand;
    }
  }
  return UlidMixin as unknown as TBase & (new (...args: any[]) => { generateUlid(): string });
}

/**
 * Backward-compatible class-based exports.
 * For composition, use the mixin functions instead.
 */
export class UuidModel extends Model {
  protected keyType = 'string';
  protected incrementing = false;

  protected generateUuid(): string {
    return randomUUID();
  }
}

export class UlidModel extends Model {
  protected keyType = 'string';
  protected incrementing = false;

  protected generateUlid(): string {
    const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const timestamp = Date.now();

    let ts = '';
    let t = timestamp;
    for (let i = 9; i >= 0; i--) {
      ts = CROCKFORD[t & 31] + ts;
      t = Math.floor(t / 32);
    }

    const bytes = randomBytes(10);
    let rand = '';
    for (let i = 0; i < 10; i++) {
      rand += CROCKFORD[bytes[i] & 31];
      if (i < 9) {
        rand += CROCKFORD[((bytes[i] >> 5) | ((bytes[i + 1] & 3) << 3)) & 31];
      } else {
        rand += CROCKFORD[(bytes[i] >> 5) & 31];
      }
    }
    rand = rand.substring(0, 16);

    return ts + rand;
  }
}

