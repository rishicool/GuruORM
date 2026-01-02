# GuruORM v2.0.10 Changelog

## Critical Bug Fix: MorphOne Relationship

### Issue
The `morphOne` polymorphic relationship was returning incorrect results. When multiple models with the same `foreignKey` value existed (e.g., a Store and a DeliveryPartner both having addresses with `is_default=true`), the relationship would return the wrong related model.

**Example Scenario:**
- Store (id: `4c312de9...`) has address with `addressable_id=4c312de9...`, `addressable_type=Store`, `pincode=452016`
- DeliveryPartner (id: `8d75faba...`) has address with `addressable_id=8d75faba...`, `addressable_type=DeliveryPartner`, `pincode=121212`
- Both have `is_default=true`
- When calling `store.primaryAddress()`, it incorrectly returned the DeliveryPartner's address

### Root Cause
1. **Constructor missing `addConstraints()` call**: The `MorphOne` constructor was not calling `this.addConstraints()`, unlike `MorphMany` which correctly called it. This meant the polymorphic constraints (`addressable_id` and `addressable_type`) were never applied to the query.

2. **Match method not verifying morphType**: The `match()` method used only the `foreignKey` to build the dictionary for eager loading, without verifying that the `morphType` also matched. This caused incorrect matches when multiple records had the same foreign key value.

### Fixes Applied

#### 1. Added `addConstraints()` call in constructor
```typescript
// Before
constructor(query: Builder, parent: Model, morphType: string, foreignKey: string, localKey: string) {
  super(query, parent);
  this.morphType = morphType;
  this.foreignKey = foreignKey;
  this.localKey = localKey;
}

// After
constructor(query: Builder, parent: Model, morphType: string, foreignKey: string, localKey: string) {
  super(query, parent);
  this.morphType = morphType;
  this.foreignKey = foreignKey;
  this.localKey = localKey;
  
  // Add the relationship constraints
  this.addConstraints();
}
```

#### 2. Updated `match()` to use composite key
```typescript
// Before
match(models: Model[], results: any, relation: string): Model[] {
  const dictionary: { [key: string]: any } = {};
  
  for (const result of results.items || results) {
    const key = result.getAttribute(this.foreignKey);
    dictionary[key] = result;
  }
  
  for (const model of models) {
    const key = model.getAttribute(this.localKey);
    if (dictionary[key]) {
      model['relations'][relation] = dictionary[key];
    }
  }
  
  return models;
}

// After
match(models: Model[], results: any, relation: string): Model[] {
  const dictionary: { [key: string]: any } = {};
  
  // Build dictionary with composite key: foreignKey + morphType
  for (const result of results.items || results) {
    const foreignKeyValue = result.getAttribute(this.foreignKey);
    const morphTypeValue = result.getAttribute(this.morphType);
    const compositeKey = `${foreignKeyValue}::${morphTypeValue}`;
    dictionary[compositeKey] = result;
  }
  
  for (const model of models) {
    const foreignKeyValue = model.getAttribute(this.localKey);
    const morphTypeValue = model.constructor.name;
    const compositeKey = `${foreignKeyValue}::${morphTypeValue}`;
    if (dictionary[compositeKey]) {
      model['relations'][relation] = dictionary[compositeKey];
    }
  }
  
  return models;
}
```

#### 3. Applied same fix to `MorphMany` for consistency
The `MorphMany` relation already had the constructor fix but also needed the composite key fix in its `match()` method.

### Impact
- **Fixes**: Polymorphic one-to-one relationships now correctly return only the related model of the correct type
- **Affects**: Both lazy loading (`await model.relation().getResults()`) and eager loading (`.with('relation')`)
- **Breaking**: None - this is a bug fix that makes the behavior correct

### Testing
All polymorphic relationship tests pass:
- ✅ Lazy loading returns correct model
- ✅ Eager loading returns correct model  
- ✅ Multiple models with same foreign key values work correctly
- ✅ Chained constraints (e.g., `.where('is_default', true)`) work correctly

### Date
January 1, 2026
