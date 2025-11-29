import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Prunable Model - inspired by Laravel and Illuminate
 * Allows models to be pruned (deleted) based on certain conditions
 */
export abstract class PrunableModel extends Model {
  /**
   * Get the prunable model query
   * Must be implemented by child classes
   */
  abstract prunable(): Builder;

  /**
   * Perform any necessary cleanup on a model instance after pruning
   */
  async pruned(): Promise<void> {
    // Can be overridden in child classes
  }

  /**
   * Prune all prunable model instances
   */
  static async prune(this: typeof Model, chunk: number = 1000): Promise<number> {
    const instance = new (this as any)() as PrunableModel;
    
    if (typeof instance.prunable !== 'function') {
      throw new Error('Model must implement prunable() method');
    }

    let total = 0;
    const query = instance.prunable();

    await query.chunk(chunk, (models: any) => {
      const modelsArray = models.all ? models.all() : models;
      
      for (const model of modelsArray) {
        // Fire pruning event and delete
        model.fireModelEvent('pruning').then((shouldContinue: boolean) => {
          if (shouldContinue === false) {
            return;
          }

          model.delete().then(() => {
            model.pruned();
            total++;
          });
        });
      }
    });

    return total;
  }
}

/**
 * Mass Prunable Model - inspired by Laravel and Illuminate
 * Allows models to be mass deleted without firing individual model events
 */
export abstract class MassPrunableModel extends Model {
  /**
   * Get the prunable model query
   * Must be implemented by child classes
   */
  abstract prunable(): Builder;

  /**
   * Perform any necessary cleanup on a model instance after pruning
   */
  async pruned(): Promise<void> {
    // Can be overridden in child classes
  }

  /**
   * Prune all prunable model instances using mass deletion
   */
  static async prune(this: typeof Model, chunk: number = 1000): Promise<number> {
    const instance = new (this as any)() as MassPrunableModel;
    
    if (typeof instance.prunable !== 'function') {
      throw new Error('Model must implement prunable() method');
    }

    let total = 0;
    const query = instance.prunable();

    await query.chunk(chunk, (models: any[]) => {
      // Get IDs for mass deletion
      const ids = models.map((model: any) => model.getKey());

      if (ids.length === 0) {
        return;
      }

      // Mass delete without events
      query.getModel().newQuery().whereKey(ids).delete().then((deleted: number) => {
        total += deleted;
      });

      // Call pruned hook on instance
      instance.pruned();
    });

    return total;
  }
}
