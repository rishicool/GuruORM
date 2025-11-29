/**
 * Event handler type
 */
export type EventHandler = (model: any) => void | Promise<void> | boolean | Promise<boolean>;

/**
 * Model events manager
 */
export class Events {
  /**
   * Registered event listeners
   */
  protected static listeners: Map<string, Map<string, EventHandler[]>> = new Map();

  /**
   * Register an event listener
   */
  static listen(modelClass: string, event: string, handler: EventHandler): void {
    if (!this.listeners.has(modelClass)) {
      this.listeners.set(modelClass, new Map());
    }

    const modelListeners = this.listeners.get(modelClass)!;
    
    if (!modelListeners.has(event)) {
      modelListeners.set(event, []);
    }

    modelListeners.get(event)!.push(handler);
  }

  /**
   * Fire an event
   */
  static async fire(modelClass: string, event: string, model: any): Promise<boolean> {
    const modelListeners = this.listeners.get(modelClass);
    
    if (!modelListeners || !modelListeners.has(event)) {
      return true;
    }

    const handlers = modelListeners.get(event)!;

    for (const handler of handlers) {
      const result = await handler(model);
      
      // If handler returns false, stop propagation
      if (result === false) {
        return false;
      }
    }

    return true;
  }

  /**
   * Remove all event listeners for a model
   */
  static flush(modelClass: string): void {
    this.listeners.delete(modelClass);
  }

  /**
   * Remove all event listeners
   */
  static flushAll(): void {
    this.listeners.clear();
  }
}

/**
 * Mixin for adding event support to models
 */
export class HasEvents {
  /**
   * The event map for the model
   */
  protected dispatchesEvents: Record<string, string> = {};

  /**
   * User-defined events
   */
  protected observables: string[] = [];

  /**
   * Register a model event listener
   */
  static creating(handler: EventHandler): void {
    Events.listen(this.name, 'creating', handler);
  }

  /**
   * Register a model event listener
   */
  static created(handler: EventHandler): void {
    Events.listen(this.name, 'created', handler);
  }

  /**
   * Register a model event listener
   */
  static updating(handler: EventHandler): void {
    Events.listen(this.name, 'updating', handler);
  }

  /**
   * Register a model event listener
   */
  static updated(handler: EventHandler): void {
    Events.listen(this.name, 'updated', handler);
  }

  /**
   * Register a model event listener
   */
  static saving(handler: EventHandler): void {
    Events.listen(this.name, 'saving', handler);
  }

  /**
   * Register a model event listener
   */
  static saved(handler: EventHandler): void {
    Events.listen(this.name, 'saved', handler);
  }

  /**
   * Register a model event listener
   */
  static deleting(handler: EventHandler): void {
    Events.listen(this.name, 'deleting', handler);
  }

  /**
   * Register a model event listener
   */
  static deleted(handler: EventHandler): void {
    Events.listen(this.name, 'deleted', handler);
  }

  /**
   * Register a model event listener
   */
  static restoring(handler: EventHandler): void {
    Events.listen(this.name, 'restoring', handler);
  }

  /**
   * Register a model event listener
   */
  static restored(handler: EventHandler): void {
    Events.listen(this.name, 'restored', handler);
  }

  /**
   * Register a model event listener
   */
  static retrieved(handler: EventHandler): void {
    Events.listen(this.name, 'retrieved', handler);
  }

  /**
   * Fire a model event
   */
  protected async fireModelEvent(event: string, halt = true): Promise<boolean> {
    const modelClass = this.constructor.name;
    return Events.fire(modelClass, event, this);
  }

  /**
   * Get the observable event names
   */
  getObservableEvents(): string[] {
    return [
      'creating', 'created', 'updating', 'updated',
      'saving', 'saved', 'deleting', 'deleted',
      'restoring', 'restored', 'retrieved',
      ...this.observables,
    ];
  }

  /**
   * Add an observable event name
   */
  addObservableEvents(...events: string[]): void {
    this.observables.push(...events);
  }

  /**
   * Remove an observable event name
   */
  removeObservableEvents(...events: string[]): void {
    this.observables = this.observables.filter(e => !events.includes(e));
  }
}
