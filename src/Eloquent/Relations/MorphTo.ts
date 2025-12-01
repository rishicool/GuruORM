import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Morph to (polymorphic inverse) relationship
 */
export class MorphTo extends Relation {
  /**
   * The foreign key of the parent model
   */
  protected foreignKey: string;

  /**
   * The associated morph type key
   */
  protected morphType: string;

  /**
   * The name of the relationship
   */
  protected relationName: string;

  /**
   * Create a new morph to relationship instance
   */
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

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    // MorphTo doesn't have standard constraints
    // The query is built dynamically based on the morph type
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    // Eager loading for morph to relationships is complex
    // Would need to group by type and load separately
  }

  /**
   * Initialize the relation on a set of models
   */
  initRelation(models: Model[], relation: string): Model[] {
    for (const model of models) {
      model['relations'][relation] = null;
    }
    return models;
  }

  /**
   * Match the eagerly loaded results to their parents
   */
  match(models: Model[], results: any, relation: string): Model[] {
    // Matching logic for morph to
    return models;
  }

  /**
   * Get the results of the relationship
   */
  async getResults(): Promise<Model | null> {
    const morphType = this.parent.getAttribute(this.morphType);
    const morphId = this.parent.getAttribute(this.foreignKey);

    if (!morphType || !morphId) {
      return null;
    }

    // Get the model class from the morph map
    const { Model: BaseModel } = require('../Model');
    const modelClass = BaseModel.getMorphedModel(morphType);
    
    if (!modelClass) {
      throw new Error(`Model class not found for morph type: ${morphType}`);
    }

    // Query the related model
    const instance = new modelClass();
    return await instance.newQuery().find(morphId);
  }

  /**
   * Associate the model instance to the given parent
   */
  associate(model: Model | null): Model {
    if (model) {
      this.parent.setAttribute(this.foreignKey, model.getKey());
      this.parent.setAttribute(this.morphType, model.constructor.name);
    } else {
      this.parent.setAttribute(this.foreignKey, null);
      this.parent.setAttribute(this.morphType, null);
    }

    return this.parent;
  }

  /**
   * Dissociate the model from the given parent
   */
  dissociate(): Model {
    this.parent.setAttribute(this.foreignKey, null);
    this.parent.setAttribute(this.morphType, null);

    return this.parent;
  }
}
