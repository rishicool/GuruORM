import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Morph to (polymorphic inverse) relationship.
 *
 * This is the inverse side of MorphOne/MorphMany. A Comment may be
 * commentable to either a Post or a Video. The `commentable_type` column
 * stores the type alias and `commentable_id` the foreign key.
 *
 * Eager loading groups models by morph type and issues one query per type,
 * avoiding the N+1 problem.
 */
export class MorphTo extends Relation {
  protected foreignKey: string;
  protected morphType: string;
  protected relationName: string;

  /**
   * Eagerly loaded results keyed by type, populated during eager loading.
   */
  private eagerResults: Map<string, Map<any, Model>> = new Map();

  constructor(
    query: Builder,
    parent: Model,
    foreignKey: string,
    morphType: string,
    relationName: string
  ) {
    super(query, parent);
    
    this.foreignKey = foreignKey;
    this.morphType = morphType;
    this.relationName = relationName;
  }

  addConstraints(): void {
    // MorphTo constraints are applied dynamically per type in getResults()
  }

  /**
   * Eager load all morph types.
   *
   * Groups models by morph type, looks up model classes from the morph map,
   * then issues one `whereIn` query per type. Results are stored in
   * `this.eagerResults` for `match()` to retrieve.
   */
  addEagerConstraints(models: Model[]): void {
    // Group models by morph type
    const grouped = new Map<string, any[]>();
    for (const model of models) {
      const morphType = model.getAttribute(this.morphType);
      const morphId = model.getAttribute(this.foreignKey);
      if (!morphType || morphId == null) continue;

      if (!grouped.has(morphType)) {
        grouped.set(morphType, []);
      }
      grouped.get(morphType)!.push(morphId);
    }

    // Store the grouped info for async resolution in matchEager()
    this._eagerGroups = grouped;
  }

  /** @internal groups built by addEagerConstraints for matchEager */
  private _eagerGroups: Map<string, any[]> = new Map();

  /**
   * Load eager results by issuing one query per morph type.
   * Called by the eager loading infrastructure after addEagerConstraints.
   */
  async loadEagerResults(): Promise<void> {
    const { Model: BaseModel } = require('../Model');

    for (const [type, ids] of this._eagerGroups.entries()) {
      const modelClass = BaseModel.getMorphedModel(type);
      if (!modelClass) continue;

      const uniqueIds = [...new Set(ids)];
      const instance = new modelClass();
      const results = await instance.newQuery().whereIn(
        instance.primaryKey || 'id',
        uniqueIds
      ).get();

      // Index results by primary key
      const indexed = new Map<any, Model>();
      const items = results.items || results;
      for (const result of items) {
        const key = result.getAttribute(instance.primaryKey || 'id') ?? result.getKey();
        indexed.set(key, result);
      }
      this.eagerResults.set(type, indexed);
    }
  }

  initRelation(models: Model[], relation: string): Model[] {
    for (const model of models) {
      model['relations'][relation] = null;
    }
    return models;
  }

  /**
   * Match eagerly loaded results back to their parent models.
   */
  match(models: Model[], results: any, relation: string): Model[] {
    for (const model of models) {
      const morphType = model.getAttribute(this.morphType);
      const morphId = model.getAttribute(this.foreignKey);

      if (!morphType || morphId == null) continue;

      const typeResults = this.eagerResults.get(morphType);
      if (typeResults) {
        const related = typeResults.get(morphId);
        if (related) {
          model['relations'][relation] = related;
        }
      }
    }
    return models;
  }

  async getResults(): Promise<Model | null> {
    const morphType = this.parent.getAttribute(this.morphType);
    const morphId = this.parent.getAttribute(this.foreignKey);

    if (!morphType || !morphId) {
      return null;
    }

    const { Model: BaseModel } = require('../Model');
    const modelClass = BaseModel.getMorphedModel(morphType);
    
    if (!modelClass) {
      throw new Error(`Model class not found for morph type: ${morphType}`);
    }

    const instance = new modelClass();
    return await instance.newQuery().find(morphId);
  }

  /**
   * Associate the model instance to the given parent.
   * Uses getMorphClass() for the type value to ensure stability
   * across minified/bundled production builds.
   */
  associate(model: Model | null): Model {
    if (model) {
      this.parent.setAttribute(this.foreignKey, model.getKey());
      this.parent.setAttribute(this.morphType, (model.constructor as typeof Model).getMorphClass());
    } else {
      this.parent.setAttribute(this.foreignKey, null);
      this.parent.setAttribute(this.morphType, null);
    }

    return this.parent;
  }

  dissociate(): Model {
    this.parent.setAttribute(this.foreignKey, null);
    this.parent.setAttribute(this.morphType, null);

    return this.parent;
  }
}
