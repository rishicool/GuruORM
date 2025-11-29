import { Model } from './Model';

/**
 * Model Observer interface
 * Observers can listen to model events without cluttering the model itself
 */
export interface Observer {
  /**
   * Handle the Model "retrieved" event
   */
  retrieved?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "creating" event
   */
  creating?(model: Model): void | Promise<void> | boolean | Promise<boolean>;

  /**
   * Handle the Model "created" event
   */
  created?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "updating" event
   */
  updating?(model: Model): void | Promise<void> | boolean | Promise<boolean>;

  /**
   * Handle the Model "updated" event
   */
  updated?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "saving" event
   */
  saving?(model: Model): void | Promise<void> | boolean | Promise<boolean>;

  /**
   * Handle the Model "saved" event
   */
  saved?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "deleting" event
   */
  deleting?(model: Model): void | Promise<void> | boolean | Promise<boolean>;

  /**
   * Handle the Model "deleted" event
   */
  deleted?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "restoring" event
   */
  restoring?(model: Model): void | Promise<void> | boolean | Promise<boolean>;

  /**
   * Handle the Model "restored" event
   */
  restored?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "replicating" event
   */
  replicating?(model: Model): void | Promise<void>;

  /**
   * Handle the Model "forceDeleting" event
   */
  forceDeleting?(model: Model): void | Promise<void> | boolean | Promise<boolean>;

  /**
   * Handle the Model "forceDeleted" event
   */
  forceDeleted?(model: Model): void | Promise<void>;
}

/**
 * Observer registry for models
 */
export class ObserverRegistry {
  /**
   * Registered observers for each model
   */
  private static observers: Map<string, Observer[]> = new Map();

  /**
   * Register an observer with the given model
   */
  static observe(modelName: string, observer: Observer): void {
    if (!this.observers.has(modelName)) {
      this.observers.set(modelName, []);
    }

    this.observers.get(modelName)!.push(observer);
  }

  /**
   * Get all observers for a model
   */
  static getObservers(modelName: string): Observer[] {
    return this.observers.get(modelName) || [];
  }

  /**
   * Remove all observers for a model
   */
  static clearObservers(modelName: string): void {
    this.observers.delete(modelName);
  }

  /**
   * Call observer methods for a given event
   */
  static async callObservers(modelName: string, event: string, model: Model): Promise<void | boolean> {
    const observers = this.getObservers(modelName);

    for (const observer of observers) {
      const method = (observer as any)[event];
      
      if (typeof method === 'function') {
        const result = await method.call(observer, model);
        
        // If the method returns false, halt the event chain
        if (result === false) {
          return false;
        }
      }
    }
  }
}
