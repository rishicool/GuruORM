import { Model } from '../Model';
import { Builder } from '../Builder';

// Constructor type for mixin pattern
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Prunable mixin function.
 * Composable: `class Post extends Prunable(SoftDeletes(Model)) {}`
 *
 * The mixed class must implement `prunable(): Builder` returning the query
 * for records eligible for pruning.
 */
export function Prunable<TBase extends Constructor>(Base: TBase) {
  class PrunableMixin extends (Base as unknown as Constructor<Model>) {
    prunable(): Builder {
      throw new Error('Model must implement prunable() method');
    }

    async pruned(): Promise<void> {}

    static async prune(this: any, chunk: number = 1000): Promise<number> {
      const instance = new this();
      if (typeof instance.prunable !== 'function') {
        throw new Error('Model must implement prunable() method');
      }
      let total = 0;
      const query = instance.prunable();
      await query.chunk(chunk, async (models: any) => {
        const modelsArray = models.all ? models.all() : models;
        for (const model of modelsArray) {
          const shouldContinue = await model.fireModelEvent('pruning');
          if (shouldContinue === false) continue;
          await model.delete();
          await model.pruned();
          total++;
        }
      });
      return total;
    }
  }
  return PrunableMixin as unknown as TBase & {
    new (...args: any[]): { prunable(): Builder; pruned(): Promise<void> };
    prune(chunk?: number): Promise<number>;
  };
}

/**
 * MassPrunable mixin function.
 * Like Prunable but uses mass deletion (no per-model events).
 */
export function MassPrunable<TBase extends Constructor>(Base: TBase) {
  class MassPrunableMixin extends (Base as unknown as Constructor<Model>) {
    prunable(): Builder {
      throw new Error('Model must implement prunable() method');
    }

    async pruned(): Promise<void> {}

    static async prune(this: any, chunk: number = 1000): Promise<number> {
      const instance = new this();
      if (typeof instance.prunable !== 'function') {
        throw new Error('Model must implement prunable() method');
      }
      let total = 0;
      const query = instance.prunable();
      await query.chunk(chunk, async (models: any[]) => {
        const ids = models.map((model: any) => model.getKey());
        if (ids.length === 0) return;
        const deleted = await query.getModel().newQuery().whereKey(ids).delete();
        total += deleted;
        await instance.pruned();
      });
      return total;
    }
  }
  return MassPrunableMixin as unknown as TBase & {
    new (...args: any[]): { prunable(): Builder; pruned(): Promise<void> };
    prune(chunk?: number): Promise<number>;
  };
}

/**
 * Backward-compatible class-based exports.
 * For composition, use the mixin functions instead.
 */
export abstract class PrunableModel extends Model {
  abstract prunable(): Builder;

  async pruned(): Promise<void> {}

  static async prune(this: typeof Model, chunk: number = 1000): Promise<number> {
    const instance = new (this as any)() as PrunableModel;
    if (typeof instance.prunable !== 'function') {
      throw new Error('Model must implement prunable() method');
    }
    let total = 0;
    const query = instance.prunable();
    await query.chunk(chunk, async (models: any) => {
      const modelsArray = models.all ? models.all() : models;
      for (const model of modelsArray) {
        const shouldContinue = await model.fireModelEvent('pruning');
        if (shouldContinue === false) continue;
        await model.delete();
        await model.pruned();
        total++;
      }
    });
    return total;
  }
}

export abstract class MassPrunableModel extends Model {
  abstract prunable(): Builder;

  async pruned(): Promise<void> {}

  static async prune(this: typeof Model, chunk: number = 1000): Promise<number> {
    const instance = new (this as any)() as MassPrunableModel;
    if (typeof instance.prunable !== 'function') {
      throw new Error('Model must implement prunable() method');
    }
    let total = 0;
    const query = instance.prunable();
    await query.chunk(chunk, async (models: any[]) => {
      const ids = models.map((model: any) => model.getKey());
      if (ids.length === 0) return;
      const deleted = await query.getModel().newQuery().whereKey(ids).delete();
      total += deleted;
      await instance.pruned();
    });
    return total;
  }
}
