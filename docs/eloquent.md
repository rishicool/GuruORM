# Eloquent ORM: Getting Started

## Introduction

GuruORM includes Eloquent, an object-relational mapper (ORM) that makes it enjoyable to interact with your database. When using Eloquent, each database table has a corresponding "Model" that is used to interact with that table. In addition to retrieving records from the database table, Eloquent models allow you to insert, update, and delete records from the table as well.

> **Note:** Eloquent ORM brings elegant database layer to Node.js applications.

Before getting started, be sure to configure a database connection. For more information on configuring your database, check out the [Getting Started documentation](./getting-started.md).

## Installation & Setup

First, install GuruORM:

```bash
npm install guruorm
```

Then, set up your database connection:

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'myapp',
  username: 'root',
  password: 'password',
  charset: 'utf8mb4',
});

// Set as global
capsule.setAsGlobal();

// Boot Eloquent ORM
capsule.bootEloquent();
```

## Defining Models

To get started, let's create an Eloquent model. Models typically live in your `models` directory and extend the `Model` class:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  // Model configuration will go here
}

export default Flight;
```

### Model Conventions

#### Table Names

By convention, the "snake case", plural name of the class will be used as the table name unless another name is explicitly specified. So, in this case, Eloquent will assume the `Flight` model stores records in the `flights` table, while an `AirTrafficController` model would store records in an `air_traffic_controllers` table.

If your model's corresponding database table does not fit this convention, you may manually specify the model's table name by defining a `table` property on the model:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  protected table = 'my_flights';
}
```

#### Primary Keys

Eloquent will assume that each model's corresponding database table has a primary key column named `id`. If necessary, you may define a protected `primaryKey` property on your model to specify a different column that serves as your model's primary key:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  protected primaryKey = 'flight_id';
}
```

In addition, Eloquent assumes that the primary key is an incrementing integer value. If you wish to use a non-incrementing or a non-numeric primary key, you must define a public `incrementing` property on your model that is set to `false`:

```typescript
class Flight extends Model {
  public incrementing = false;
}
```

If your model's primary key is not an integer, you should define a protected `keyType` property on your model. This property should have a value of `'string'`:

```typescript
class Flight extends Model {
  protected keyType = 'string';
}
```

#### Timestamps

By default, Eloquent expects `created_at` and `updated_at` columns to exist on your model's corresponding database table. Eloquent will automatically set these column's values when models are created or updated. If you do not want these columns to be automatically managed by Eloquent, you should define a `timestamps` property on your model with a value of `false`:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  public timestamps = false;
}
```

If you need to customize the names of the columns used to store the timestamps, you may define `CREATED_AT` and `UPDATED_AT` constants on your model:

```typescript
class Flight extends Model {
  static readonly CREATED_AT = 'creation_date';
  static readonly UPDATED_AT = 'updated_date';
}
```

#### Database Connections

By default, all Eloquent models will use the default database connection that is configured for your application. If you would like to specify a different connection that should be used when interacting with a particular model, you should define a `connection` property on the model:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  protected connection = 'mysql';
}
```

#### Default Attribute Values

By default, a newly instantiated model instance will not contain any attribute values. If you would like to define the default values for some of your model's attributes, you may define an `attributes` property on your model:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  protected attributes = {
    options: '[]',
    delayed: false,
  };
}
```

## Retrieving Models

Once you have created a model and its associated database table, you are ready to start retrieving data from your database. You can think of each Eloquent model as a powerful query builder allowing you to fluently query the database table associated with the model.

The model's `all()` method will retrieve all of the records from the model's associated database table:

```typescript
import Flight from './models/Flight';

const flights = await Flight.all();

for (const flight of flights) {
  console.log(flight.name);
}
```

### Building Queries

The Eloquent `all()` method will return all of the results in the model's table. However, since each Eloquent model serves as a query builder, you may add additional constraints to queries and then invoke the `get()` method to retrieve the results:

```typescript
const flights = await Flight.where('active', 1)
  .orderBy('name', 'desc')
  .limit(10)
  .get();
```

> **Note:** Since Eloquent models are query builders, you should review all of the methods provided by GuruORM's query builder. You may use any of these methods when writing your Eloquent queries.

### Refreshing Models

If you already have an instance of an Eloquent model that was retrieved from the database, you can "refresh" the model using the `fresh()` and `refresh()` methods. The `fresh()` method will re-retrieve the model from the database. The existing model instance will not be affected:

```typescript
const flight = await Flight.where('number', 'FR 900').first();

const freshFlight = await flight.fresh();
```

The `refresh()` method will re-hydrate the existing model using fresh data from the database. In addition, all of its loaded relationships will be refreshed as well:

```typescript
const flight = await Flight.where('number', 'FR 900').first();

flight.number = 'FR 456';

await flight.refresh();

console.log(flight.number); // "FR 900"
```

### Collections

As we have seen, Eloquent methods like `all()` and `get()` retrieve multiple records from the database. However, these methods don't return a plain array. Instead, an instance of `Collection` is returned.

The Eloquent `Collection` class provides a variety of helpful methods for interacting with data collections. For example, the `reject()` method may be used to remove models from a collection based on the results of a callback:

```typescript
const flights = await Flight.where('destination', 'Paris').get();

const activeFlights = flights.reject((flight) => {
  return flight.cancelled;
});
```

You may loop over collections as if they were an array:

```typescript
for (const flight of flights) {
  console.log(flight.name);
}
```

### Chunking Results

Your application may run out of memory if you attempt to load tens of thousands of Eloquent records via the `all()` or `get()` methods. Instead of using these methods, the `chunk()` method may be used to process large numbers of models more efficiently.

The `chunk()` method will retrieve a subset of Eloquent models, passing them to a callback for processing. Since only the current chunk of Eloquent models is retrieved at a time, the `chunk()` method will provide significantly reduced memory usage when working with a large number of models:

```typescript
import Flight from './models/Flight';

await Flight.chunk(200, async (flights) => {
  for (const flight of flights) {
    // Process flight
  }
});
```

The first argument passed to the `chunk()` method is the number of records you wish to receive per "chunk". The callback passed as the second argument will be invoked for each chunk that is retrieved from the database.

### Cursors

The `cursor()` method may be used to significantly reduce your application's memory consumption when iterating through thousands of Eloquent model records.

The `cursor()` method will only execute a single database query; however, the individual Eloquent models will not be hydrated until they are actually iterated over. Therefore, only one Eloquent model is kept in memory at any given time while iterating over the cursor:

```typescript
import Flight from './models/Flight';

for await (const flight of Flight.where('destination', 'Zurich').cursor()) {
  // Process flight
}
```

## Retrieving Single Models / Aggregates

In addition to retrieving all of the records matching a given query, you may also retrieve single records using the `find()`, `first()`, or `firstWhere()` methods. Instead of returning a collection of models, these methods return a single model instance:

```typescript
import Flight from './models/Flight';

// Retrieve a model by its primary key
const flight = await Flight.find(1);

// Retrieve the first model matching the query constraints
const flight = await Flight.where('active', 1).first();

// Alternative to retrieving the first model matching the query constraints
const flight = await Flight.firstWhere('active', 1);
```

Sometimes you may wish to perform some other action if no results are found. The `findOr()` and `firstOr()` methods will return a single model instance or, if no results are found, execute the given callback. The value returned by the callback will be considered the result of the method:

```typescript
const flight = await Flight.findOr(1, () => {
  // Create a default flight or throw exception
  return new Flight({ name: 'Default Flight' });
});

const flight = await Flight.where('legs', '>', 3).firstOr(() => {
  // Return default value
  return null;
});
```

### Not Found Exceptions

Sometimes you may wish to throw an exception if a model is not found. This is particularly useful in routes or controllers. The `findOrFail()` and `firstOrFail()` methods will retrieve the first result of the query; however, if no result is found, a `ModelNotFoundException` will be thrown:

```typescript
const flight = await Flight.findOrFail(1);

const flight = await Flight.where('legs', '>', 3).firstOrFail();
```

### Retrieving or Creating Models

The `firstOrCreate()` method will attempt to locate a database record using the given column / value pairs. If the model cannot be found in the database, a record will be inserted with the attributes resulting from merging the first array argument with the optional second array argument:

The `firstOrNew()` method, like `firstOrCreate()`, will attempt to locate a record in the database matching the given attributes. However, if a model is not found, a new model instance will be returned. Note that the model returned by `firstOrNew()` has not yet been persisted to the database. You will need to manually call the `save()` method to persist it:

```typescript
import Flight from './models/Flight';

// Retrieve flight by name or create it if it doesn't exist
const flight = await Flight.firstOrCreate({
  name: 'London to Paris',
});

// Retrieve flight by name or create it with the name, delayed, and arrival_time attributes
const flight = await Flight.firstOrCreate(
  { name: 'London to Paris' },
  { delayed: 1, arrival_time: '11:30' }
);

// Retrieve flight by name or instantiate a new Flight instance
const flight = await Flight.firstOrNew({
  name: 'London to Paris',
});

// Retrieve flight by name or instantiate with the name, delayed, and arrival_time attributes
const flight = await Flight.firstOrNew(
  { name: 'Tokyo to Sydney' },
  { delayed: 1, arrival_time: '11:30' }
);
```

### Retrieving Aggregates

When interacting with Eloquent models, you may also use the `count()`, `sum()`, `max()`, and other aggregate methods provided by GuruORM's query builder. As you might expect, these methods return a scalar value instead of an Eloquent model instance:

```typescript
const count = await Flight.where('active', 1).count();

const max = await Flight.where('active', 1).max('price');
```

## Inserting and Updating Models

### Inserts

Of course, when using Eloquent, we don't only need to retrieve models from the database. We also need to insert new records. Thankfully, Eloquent makes it simple. To insert a new record into the database, you should instantiate a new model instance and set attributes on the model. Then, call the `save()` method on the model instance:

```typescript
import Flight from './models/Flight';

async function store() {
  const flight = new Flight();
  
  flight.name = 'Sydney to Tokyo';
  
  await flight.save();
}
```

In this example, we assign the `name` attribute to the `Flight` model instance. When we call the `save()` method, a record will be inserted into the database. The model's `created_at` and `updated_at` timestamps will automatically be set when the `save()` method is called, so there is no need to set them manually.

Alternatively, you may use the `create()` method to "save" a new model using a single statement. The inserted model instance will be returned to you by the `create()` method:

```typescript
import Flight from './models/Flight';

const flight = await Flight.create({
  name: 'London to Paris',
});
```

However, before using the `create()` method, you will need to specify either a `fillable` or `guarded` property on your model class. These properties are required because all Eloquent models are protected against mass assignment vulnerabilities by default.

### Updates

The `save()` method may also be used to update models that already exist in the database. To update a model, you should retrieve it and set any attributes you wish to update. Then, you should call the model's `save()` method. Again, the `updated_at` timestamp will automatically be updated, so there is no need to manually set its value:

```typescript
import Flight from './models/Flight';

const flight = await Flight.find(1);

flight.name = 'Paris to London';

await flight.save();
```

#### Mass Updates

Updates can also be performed against models that match a given query. In this example, all flights that are `active` and have a `destination` of `San Diego` will be marked as delayed:

```typescript
await Flight.where('active', 1)
  .where('destination', 'San Diego')
  .update({ delayed: 1 });
```

The `update()` method expects an object of column and value pairs representing the columns that should be updated. The `update()` method returns the number of affected rows.

> **Warning:** When issuing a mass update via Eloquent, the `saving`, `saved`, `updating`, and `updated` model events will not be fired for the updated models. This is because the models are never actually retrieved when issuing a mass update.

#### Examining Attribute Changes

Eloquent provides the `isDirty()`, `isClean()`, and `wasChanged()` methods to examine the internal state of your model and determine how its attributes have changed from when the model was originally retrieved.

The `isDirty()` method determines if any of the model's attributes have been changed since the model was retrieved. You may pass a specific attribute name to the `isDirty()` method to determine if a particular attribute is dirty:

```typescript
import User from './models/User';

const user = await User.create({
  first_name: 'Taylor',
  last_name: 'Otwell',
  title: 'Developer',
});

user.title = 'Painter';

user.isDirty(); // true
user.isDirty('title'); // true
user.isDirty('first_name'); // false

user.isClean(); // false
user.isClean('title'); // false
user.isClean('first_name'); // true

await user.save();

user.isDirty(); // false
user.isClean(); // true
```

The `wasChanged()` method determines if any attributes were changed when the model was last saved within the current request cycle:

```typescript
const user = await User.create({
  first_name: 'Taylor',
  last_name: 'Otwell',
  title: 'Developer',
});

user.title = 'Painter';

await user.save();

user.wasChanged(); // true
user.wasChanged('title'); // true
user.wasChanged('first_name'); // false
```

The `getOriginal()` method returns an object containing the original attributes of the model regardless of any changes to the model since it was retrieved:

```typescript
const user = await User.find(1);

user.name; // John
user.email; // john@example.com

user.name = 'Jack';
user.name; // Jack

user.getOriginal('name'); // John
user.getOriginal(); // Object of original attributes
```

### Mass Assignment

You may use the `create()` method to "save" a new model using a single statement. The inserted model instance will be returned to you by the method:

```typescript
import Flight from './models/Flight';

const flight = await Flight.create({
  name: 'London to Paris',
});
```

However, before using the `create()` method, you will need to specify either a `fillable` or `guarded` property on your model class. These properties are required because all Eloquent models are protected against mass assignment vulnerabilities by default.

A mass assignment vulnerability occurs when a user passes an unexpected field through a request and that field changes a column in your database that you did not expect. For example, a malicious user might send an `is_admin` parameter through a request, which is then passed to your model's `create()` method, allowing the user to escalate themselves to an administrator.

So, to get started, you should define which model attributes you want to make mass assignable. You may do this using the `fillable` property on the model. For example, let's make the `name` attribute of our `Flight` model mass assignable:

```typescript
import { Model } from 'guruorm';

class Flight extends Model {
  protected fillable = ['name'];
}
```

Once you have specified which attributes are mass assignable, you may use the `create()` method to insert a new record in the database. The `create()` method returns the newly created model instance:

```typescript
const flight = await Flight.create({ name: 'London to Paris' });
```

If you already have a model instance, you may use the `fill()` method to populate it with an array of attributes:

```typescript
flight.fill({ name: 'Amsterdam to Frankfurt' });
```

#### Allowing Mass Assignment

If you would like to make all of your attributes mass assignable, you may define your model's `guarded` property as an empty array:

```typescript
class Flight extends Model {
  protected guarded = [];
}
```

### Upserts

Eloquent's `upsert()` method may be used to update or create records in a single, atomic operation. The method's first argument consists of the values to insert or update, while the second argument lists the column(s) that uniquely identify records within the associated table. The method's third and final argument is an array of the columns that should be updated if a matching record already exists in the database:

```typescript
await Flight.upsert(
  [
    { departure: 'Oakland', destination: 'San Diego', price: 99 },
    { departure: 'Chicago', destination: 'New York', price: 150 },
  ],
  ['departure', 'destination'],
  ['price']
);
```

> **Note:** All databases except SQL Server require the columns in the second argument of the `upsert()` method to have a "primary" or "unique" index.

## Deleting Models

To delete a model, you may call the `delete()` method on the model instance:

```typescript
import Flight from './models/Flight';

const flight = await Flight.find(1);

await flight.delete();
```

### Deleting an Existing Model by its Primary Key

In the example above, we are retrieving the model from the database before calling the `delete()` method. However, if you know the primary key of the model, you may delete the model without explicitly retrieving it by calling the `destroy()` method. In addition to accepting a single primary key, the `destroy()` method will accept multiple primary keys or an array of primary keys:

```typescript
await Flight.destroy(1);

await Flight.destroy(1, 2, 3);

await Flight.destroy([1, 2, 3]);
```

### Deleting Models Using Queries

Of course, you may build an Eloquent query to delete all models matching your query's criteria. In this example, we will delete all flights that are marked as inactive:

```typescript
const deleted = await Flight.where('active', 0).delete();
```

> **Warning:** When executing a mass delete statement via Eloquent, the `deleting` and `deleted` model events will not be dispatched for the deleted models. This is because the models are never actually retrieved when executing the delete statement.

### Soft Deleting

In addition to actually removing records from your database, Eloquent can also "soft delete" models. When models are soft deleted, they are not actually removed from your database. Instead, a `deleted_at` attribute is set on the model indicating the date and time at which the model was "deleted". To enable soft deletes for a model, add the `SoftDeletes` trait to the model:

```typescript
import { Model, SoftDeletes } from 'guruorm';

class Flight extends Model {
  use = [SoftDeletes];
}
```

You should also add the `deleted_at` column to your database table.

Now, when you call the `delete()` method on the model, the `deleted_at` column will be set to the current date and time. However, the model's database record will be left in the table. When querying a model that uses soft deletes, the soft deleted models will automatically be excluded from all query results.

To determine if a given model instance has been soft deleted, you may use the `trashed()` method:

```typescript
if (flight.trashed()) {
  // Model is soft deleted
}
```

#### Restoring Soft Deleted Models

Sometimes you may wish to "un-delete" a soft deleted model. To restore a soft deleted model, you may call the `restore()` method on a model instance:

```typescript
await flight.restore();
```

You may also use the `restore()` method in a query to restore multiple models:

```typescript
await Flight.withTrashed()
  .where('airline_id', 1)
  .restore();
```

#### Permanently Deleting Models

Sometimes you may need to truly remove a model from your database. You may use the `forceDelete()` method to permanently remove a soft deleted model from the database table:

```typescript
await flight.forceDelete();
```

#### Querying Soft Deleted Models

**Including Soft Deleted Models**

As noted above, soft deleted models will automatically be excluded from query results. However, you may force soft deleted models to be included in a query's results by calling the `withTrashed()` method on the query:

```typescript
import Flight from './models/Flight';

const flights = await Flight.withTrashed()
  .where('account_id', 1)
  .get();
```

**Retrieving Only Soft Deleted Models**

The `onlyTrashed()` method will retrieve only soft deleted models:

```typescript
const flights = await Flight.onlyTrashed()
  .where('airline_id', 1)
  .get();
```

## Query Scopes

### Global Scopes

Global scopes allow you to add constraints to all queries for a given model. Eloquent's own soft delete functionality utilizes global scopes to only retrieve "non-deleted" models from the database. Writing your own global scopes can provide a convenient, easy way to make sure every query for a given model receives certain constraints.

#### Writing Global Scopes

Writing a global scope is simple. Create a class that implements the `Scope` interface. The `Scope` interface requires you to implement one method: `apply()`. The `apply()` method may add `where` constraints or other types of clauses to the query as needed:

```typescript
import { Scope, Builder, Model } from 'guruorm';

class AncientScope implements Scope {
  apply(builder: Builder, model: typeof Model): void {
    builder.where('created_at', '<', new Date(Date.now() - 2000 * 365 * 24 * 60 * 60 * 1000));
  }
}
```

#### Applying Global Scopes

To assign a global scope to a model, you should override the model's `booted()` method and invoke the model's `addGlobalScope()` method:

```typescript
import { Model } from 'guruorm';
import AncientScope from './scopes/AncientScope';

class User extends Model {
  protected static booted(): void {
    static.addGlobalScope(new AncientScope());
  }
}
```

After adding the scope, a call to `User.all()` will execute the following SQL query:

```sql
select * from `users` where `created_at` < '2021-02-18 00:00:00'
```

#### Anonymous Global Scopes

Eloquent also allows you to define global scopes using closures, which is particularly useful for simple scopes that do not warrant a separate class:

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected static booted(): void {
    static.addGlobalScope('ancient', (builder) => {
      builder.where('created_at', '<', new Date(Date.now() - 2000 * 365 * 24 * 60 * 60 * 1000));
    });
  }
}
```

#### Removing Global Scopes

If you would like to remove a global scope for a given query, you may use the `withoutGlobalScope()` method. This method accepts the class name of the global scope as its only argument:

```typescript
await User.withoutGlobalScope(AncientScope).get();
```

Or, if you defined the global scope using a closure, you should pass the string name that you assigned to the global scope:

```typescript
await User.withoutGlobalScope('ancient').get();
```

If you would like to remove several or even all of the query's global scopes, you may use the `withoutGlobalScopes()` method:

```typescript
// Remove all of the global scopes
await User.withoutGlobalScopes().get();

// Remove some of the global scopes
await User.withoutGlobalScopes([FirstScope, SecondScope]).get();
```

### Local Scopes

Local scopes allow you to define common sets of query constraints that you may easily re-use throughout your application. For example, you may need to frequently retrieve all users that are considered "popular". To define a scope, prefix an Eloquent model method with `scope`:

```typescript
import { Model, Builder } from 'guruorm';

class User extends Model {
  scopePopular(query: Builder): void {
    query.where('votes', '>', 100);
  }

  scopeActive(query: Builder): void {
    query.where('active', 1);
  }
}
```

#### Utilizing a Local Scope

Once the scope has been defined, you may call the scope methods when querying the model. However, you should not include the `scope` prefix when calling the method:

```typescript
const users = await User.popular().active().orderBy('created_at').get();
```

#### Dynamic Scopes

Sometimes you may wish to define a scope that accepts parameters. To get started, just add your additional parameters to your scope method's signature. Scope parameters should be defined after the `query` parameter:

```typescript
import { Model, Builder } from 'guruorm';

class User extends Model {
  scopeOfType(query: Builder, type: string): void {
    query.where('type', type);
  }
}
```

Once the expected arguments have been added to your scope method's signature, you may pass the arguments when calling the scope:

```typescript
const users = await User.ofType('admin').get();
```

## Comparing Models

Sometimes you may need to determine if two models are the "same" or not. The `is()` and `isNot()` methods may be used to quickly verify two models have the same primary key, table, and database connection or not:

```typescript
if (post.is(anotherPost)) {
  // Same model
}

if (post.isNot(anotherPost)) {
  // Different models
}
```

## Events

Eloquent models dispatch several events, allowing you to hook into the following moments in a model's lifecycle: `retrieved`, `creating`, `created`, `updating`, `updated`, `saving`, `saved`, `deleting`, `deleted`, `restoring`, `restored`, and `forceDeleting`, `forceDeleted`.

The `retrieved` event will dispatch when an existing model is retrieved from the database. When a new model is saved for the first time, the `creating` and `created` events will dispatch. The `updating` / `updated` events will dispatch when an existing model is modified and the `save()` method is called. The `saving` / `saved` events will dispatch when a model is created or updated.

To start listening to model events, define a `dispatchesEvents` property on your Eloquent model:

```typescript
import { Model } from 'guruorm';
import UserSaved from './events/UserSaved';
import UserDeleted from './events/UserDeleted';

class User extends Model {
  protected dispatchesEvents = {
    'saved': UserSaved,
    'deleted': UserDeleted,
  };
}
```

### Using Closures

Instead of using custom event classes, you may register closures that execute when various model events are dispatched. Typically, you should register these closures in the `booted()` method of your model:

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected static booted(): void {
    static.created((user) => {
      // Handle the created event
    });
  }
}
```

### Observers

If you are listening for many events on a given model, you may use observers to group all of your listeners into a single class. Observer classes have method names which reflect the Eloquent events you wish to listen for. Each of these methods receives the affected model as their only argument:

```typescript
class UserObserver {
  created(user: User): void {
    // Handle the created event
  }

  updated(user: User): void {
    // Handle the updated event
  }

  deleted(user: User): void {
    // Handle the deleted event
  }
}
```

To register an observer, you should call the `observe()` method on the model you wish to observe:

```typescript
import User from './models/User';
import UserObserver from './observers/UserObserver';

User.observe(new UserObserver());
```

### Muting Events

You may occasionally need to temporarily "mute" all events fired by a model. You may achieve this using the `withoutEvents()` method:

```typescript
const user = await User.withoutEvents(() => {
  await User.findOrFail(1).delete();
  
  return User.find(2);
});
```

#### Saving a Single Model Without Events

Sometimes you may wish to "save" a given model without dispatching any events. You may accomplish this using the `saveQuietly()` method:

```typescript
const user = await User.findOrFail(1);

user.name = 'Victoria Faith';

await user.saveQuietly();
```

You may also "update", "delete", "soft delete", "restore", and "replicate" a given model without dispatching any events:

```typescript
await user.deleteQuietly();
await user.forceDeleteQuietly();
await user.restoreQuietly();
```

## Attribute Casting

### Introduction

Attribute casting allows you to convert attributes to common data types. The `casts` property on your model provides a convenient method of converting attributes to their proper types. The `casts` property should be an object where the key is the name of the attribute being cast and the value is the type you wish to cast the column to.

### Available Cast Types

The supported cast types are:

- `'integer'` / `'int'` - Cast to integer
- `'real'` / `'float'` / `'double'` - Cast to float
- `'decimal:2'` - Cast to decimal with precision
- `'string'` - Cast to string
- `'boolean'` / `'bool'` - Cast to boolean
- `'object'` - Cast to object
- `'array'` - Cast to array
- `'collection'` - Cast to Collection instance
- `'date'` - Cast to Date object
- `'datetime'` - Cast to datetime
- `'timestamp'` - Cast to Unix timestamp
- `'json'` - Cast to/from JSON string

### Defining Casts

To define attribute casts, define a `casts` property on your model:

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected casts = {
    email_verified_at: 'datetime',
    is_admin: 'boolean',
    options: 'json',
    settings: 'object',
    tags: 'array',
    birthday: 'date',
    score: 'float',
    votes: 'integer',
  };
}
```

Now, the `is_admin` attribute will always be cast to a boolean when you access it:

```typescript
const user = await User.find(1);

if (user.is_admin) {
  // is_admin is now a boolean
}
```

### Array & JSON Casting

The `array` and `json` cast types are particularly useful when working with columns that store serialized data:

```typescript
class User extends Model {
  protected casts = {
    options: 'json',
    permissions: 'array',
  };
}

const user = await User.find(1);

// Access as object
console.log(user.options.theme);

// Access as array
console.log(user.permissions[0]);

// Set as object/array
user.options = { theme: 'dark', language: 'en' };
user.permissions = ['read', 'write'];

await user.save();
```

### Date Casting

When casting attributes to `date` or `datetime`, you can access the value as a JavaScript Date object:

```typescript
class User extends Model {
  protected casts = {
    created_at: 'datetime',
    birthday: 'date',
  };
}

const user = await User.find(1);

console.log(user.birthday.toISOString());
console.log(user.created_at.getTime());
```

### Decimal Casting

The `decimal` cast requires a precision parameter:

```typescript
class Product extends Model {
  protected casts = {
    price: 'decimal:2',
    tax_rate: 'decimal:4',
  };
}
```

### Custom Casts

You may define your own custom cast types by creating a class that implements the `CastsAttributes` interface:

```typescript
import { CastsAttributes } from 'guruorm';

class UpperCaseCast implements CastsAttributes {
  get(model: any, key: string, value: any, attributes: any): any {
    return value ? value.toUpperCase() : value;
  }

  set(model: any, key: string, value: any, attributes: any): any {
    return value ? value.toUpperCase() : value;
  }
}
```

Then use it in your model:

```typescript
import { Model } from 'guruorm';
import UpperCaseCast from './casts/UpperCaseCast';

class User extends Model {
  protected casts = {
    name: UpperCaseCast,
  };
}
```

## Hiding Attributes From JSON

### Introduction

Sometimes you may wish to limit the attributes that are included in your model's array or JSON representation, such as passwords or secret keys. To do so, add a `hidden` property to your model:

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected hidden = ['password', 'remember_token'];
}
```

Now when you convert the model to an array or JSON, the hidden attributes will not be included:

```typescript
const user = await User.find(1);

const array = user.toArray();
// password and remember_token are not included

const json = user.toJSON();
// password and remember_token are not included
```

### Temporarily Revealing Hidden Attributes

If you would like to make a typically hidden attribute visible on a given model instance, you may use the `makeVisible()` method:

```typescript
const user = await User.find(1);

user.makeVisible('password');

const array = user.toArray();
// password is now included
```

You may also make multiple attributes visible:

```typescript
user.makeVisible(['password', 'remember_token']);
```

### Temporarily Hiding Visible Attributes

Conversely, if you would like to hide an attribute that is typically visible, you may use the `makeHidden()` method:

```typescript
const user = await User.find(1);

user.makeHidden(['email', 'phone']);

const array = user.toArray();
// email and phone are now hidden
```

### Whitelisting Visible Attributes

Alternatively, you may define a `visible` property to define an "allow list" of attributes that should be included in your model's array and JSON representation. All attributes not present in the `visible` array will be hidden:

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected visible = ['id', 'name', 'email'];
}
```

## Appending Values to JSON

### Introduction

Occasionally, you may need to add attributes to your model's array or JSON representation that do not have a corresponding column in your database. To do so, first define an accessor for the value:

```typescript
import { Model } from 'guruorm';

class User extends Model {
  getFullNameAttribute(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}
```

Then add the attribute name to the `appends` property:

```typescript
class User extends Model {
  protected appends = ['full_name'];
  
  getFullNameAttribute(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}
```

Now the `full_name` attribute will be included when the model is converted to an array or JSON:

```typescript
const user = await User.find(1);

const array = user.toArray();
console.log(array.full_name); // "John Doe"
```

## Model Replication

You may create an un-saved copy of an existing model instance using the `replicate()` method. This method is particularly useful when you have model instances that share many of the same attributes:

```typescript
const shipping = await Address.create({
  type: 'shipping',
  line_1: '123 Example Street',
  city: 'Victorville',
  state: 'CA',
  postcode: '90001',
});

const billing = shipping.replicate();

billing.fill({ type: 'billing' });

await billing.save();
```

To exclude one or more attributes from being replicated, you may pass an array to the `replicate()` method:

```typescript
const billing = shipping.replicate(['type']);
```

## Fresh Models & Refresh

### The `fresh` Method

If you already have an instance of an Eloquent model that was retrieved from the database, you can "refresh" the model using the `fresh()` method. The `fresh()` method will re-retrieve the model from the database. The existing model instance will not be affected:

```typescript
const user = await User.where('name', 'John').first();

const freshUser = await user.fresh();
```

### The `refresh` Method

The `refresh()` method will re-hydrate the existing model using fresh data from the database. In addition, all of its loaded relationships will be refreshed as well:

```typescript
const user = await User.where('name', 'John').first();

user.name = 'Jack';

await user.refresh();

console.log(user.name); // Still "John" - refreshed from database
```

## Pagination in Eloquent

All pagination methods available on the query builder are also available on Eloquent models:

```typescript
// Standard pagination
const users = await User.where('active', true).paginate(15, 1);

// Simple pagination
const users = await User.orderBy('created_at').simplePaginate(20);

// Cursor pagination
const users = await User.cursorPaginate(10);
```

For more information on pagination, see the [Query Builder documentation](./query-builder.md#pagination).

## Comparing Models

Sometimes you may need to determine if two models are the "same" or not. The `is()` and `isNot()` methods may be used to quickly verify two models have the same primary key, table, and database connection or not:

```typescript
if (post.is(anotherPost)) {
  // Same model
}

if (post.isNot(anotherPost)) {
  // Different models
}
```

## Next Steps

Now that you've learned the basics of Eloquent ORM, you're ready to dive deeper:

- [Relationships](./relationships.md) - Define and work with model relationships
- [Collections](./collections.md) - Work with collections of models
- [Mutators & Casting](./mutators.md) - Transform model attributes
- [API Resources](./api-resources.md) - Transform models for API responses
- [Serialization](./serialization.md) - Convert models to arrays and JSON
