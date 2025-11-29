# Eloquent: Relationships

## Introduction

Database tables are often related to one another. For example, a blog post may have many comments or an order could be related to the user who placed it. Eloquent makes managing and working with these relationships easy, and supports a variety of common relationships:

- [One To One](#one-to-one)
- [One To Many](#one-to-many)
- [Many To Many](#many-to-many)
- [Has One Through](#has-one-through)
- [Has Many Through](#has-many-through)
- [One To One (Polymorphic)](#one-to-one-polymorphic)
- [One To Many (Polymorphic)](#one-to-many-polymorphic)
- [Many To Many (Polymorphic)](#many-to-many-polymorphic)

## Defining Relationships

Eloquent relationships are defined as methods on your Eloquent model classes. Since relationships also serve as powerful query builders, defining relationships as methods provides powerful method chaining and querying capabilities.

## One To One

A one-to-one relationship is a very basic type of database relationship. For example, a `User` model might be associated with one `Phone` model. To define this relationship, we will place a `phone` method on the `User` model. The `phone` method should call the `hasOne` method and return its result:

```typescript
import { Model } from 'guruorm';
import Phone from './Phone';

class User extends Model {
  phone() {
    return this.hasOne(Phone);
  }
}
```

The first argument passed to the `hasOne` method is the class of the related model. Once the relationship is defined, we may retrieve the related record using Eloquent's dynamic properties. Dynamic properties allow you to access relationship methods as if they were properties defined on the model:

```typescript
import User from './models/User';

const user = await User.find(1);

const phone = await user.phone;
```

Eloquent determines the foreign key of the relationship based on the parent model name. In this case, the `Phone` model is automatically assumed to have a `user_id` foreign key. If you wish to override this convention, you may pass a second argument to the `hasOne` method:

```typescript
phone() {
  return this.hasOne(Phone, 'foreign_key');
}
```

Additionally, Eloquent assumes that the foreign key should have a value matching the primary key column of the parent. In other words, Eloquent will look for the value of the user's `id` column in the `user_id` column of the `Phone` record. If you would like the relationship to use a primary key value other than `id` or your model's `primaryKey` property, you may pass a third argument to the `hasOne` method:

```typescript
phone() {
  return this.hasOne(Phone, 'foreign_key', 'local_key');
}
```

### Defining the Inverse of the Relationship

So, we can access the `Phone` model from our `User` model. Next, let's define a relationship on the `Phone` model that will let us access the user that owns the phone. We can define the inverse of a `hasOne` relationship using the `belongsTo` method:

```typescript
import { Model } from 'guruorm';
import User from './User';

class Phone extends Model {
  user() {
    return this.belongsTo(User);
  }
}
```

When invoking the `user` method, Eloquent will attempt to find a `User` model that has an `id` which matches the `user_id` column on the `Phone` model.

Eloquent determines the foreign key name by examining the name of the relationship method and suffixing the method name with `_id`. So, in this case, Eloquent assumes that the `Phone` model has a `user_id` column. However, if the foreign key on the `Phone` model is not `user_id`, you may pass a custom key name as the second argument to the `belongsTo` method:

```typescript
user() {
  return this.belongsTo(User, 'foreign_key');
}
```

If the parent model does not use `id` as its primary key, or you wish to find the associated model using a different column, you may pass a third argument to the `belongsTo` method specifying the parent table's custom key:

```typescript
user() {
  return this.belongsTo(User, 'foreign_key', 'owner_key');
}
```

## One To Many

A one-to-many relationship is used to define relationships where a single model is the parent to one or more child models. For example, a blog post may have an infinite number of comments. Like all other Eloquent relationships, one-to-many relationships are defined by defining a method on your Eloquent model:

```typescript
import { Model } from 'guruorm';
import Comment from './Comment';

class Post extends Model {
  comments() {
    return this.hasMany(Comment);
  }
}
```

Remember, Eloquent will automatically determine the proper foreign key column for the `Comment` model. By convention, Eloquent will take the "snake case" name of the parent model and suffix it with `_id`. So, in this example, Eloquent will assume the foreign key column on the `Comment` model is `post_id`.

Once the relationship method has been defined, we can access the collection of related comments by accessing the `comments` property. Remember, since Eloquent provides "dynamic relationship properties", we can access relationship methods as if they were defined as properties on the model:

```typescript
import Post from './models/Post';

const post = await Post.find(1);

const comments = await post.comments;

for (const comment of comments) {
  console.log(comment);
}
```

Since all relationships also serve as query builders, you may add further constraints to the relationship query by calling the `comments` method and continuing to chain conditions onto the query:

```typescript
const comment = await post.comments()
  .where('title', 'foo')
  .first();
```

Like the `hasOne` method, you may also override the foreign and local keys by passing additional arguments to the `hasMany` method:

```typescript
comments() {
  return this.hasMany(Comment, 'foreign_key');
}

comments() {
  return this.hasMany(Comment, 'foreign_key', 'local_key');
}
```

### One To Many (Inverse) / Belongs To

Now that we can access all of a post's comments, let's define a relationship to allow a comment to access its parent post. To define the inverse of a `hasMany` relationship, define a relationship method on the child model which calls the `belongsTo` method:

```typescript
import { Model } from 'guruorm';
import Post from './Post';

class Comment extends Model {
  post() {
    return this.belongsTo(Post);
  }
}
```

Once the relationship has been defined, we can retrieve a comment's parent post by accessing the `post` "dynamic relationship property":

```typescript
import Comment from './models/Comment';

const comment = await Comment.find(1);

console.log(comment.post.title);
```

## Many To Many

Many-to-many relations are slightly more complicated than `hasOne` and `hasMany` relationships. An example of a many-to-many relationship is a user that has many roles and those roles are also shared by other users in the application. For example, a user may be assigned the role of "Author" and "Editor"; however, those roles may also be assigned to other users as well. So, a user has many roles and a role has many users.

### Table Structure

To define this relationship, three database tables are needed: `users`, `roles`, and `role_user`. The `role_user` table is derived from the alphabetical order of the related model names and contains `user_id` and `role_id` columns. This table is used as an intermediate table linking the users and roles.

### Model Structure

Many-to-many relationships are defined by writing a method that returns the result of the `belongsToMany` method. The `belongsToMany` method is provided by the `Model` base class that is used by all of your application's Eloquent models:

```typescript
import { Model } from 'guruorm';
import Role from './Role';

class User extends Model {
  roles() {
    return this.belongsToMany(Role);
  }
}
```

Once the relationship is defined, you may access the user's roles using the `roles` dynamic relationship property:

```typescript
import User from './models/User';

const user = await User.find(1);

for (const role of await user.roles) {
  console.log(role.name);
}
```

Since all relationships also serve as query builders, you may add further constraints to the relationship query by calling the `roles` method and continuing to chain conditions onto the query:

```typescript
const roles = await user.roles().orderBy('name').get();
```

To determine the table name of the relationship's intermediate table, Eloquent will join the two related model names in alphabetical order. However, you are free to override this convention. You may do so by passing a second argument to the `belongsToMany` method:

```typescript
roles() {
  return this.belongsToMany(Role, 'role_user');
}
```

In addition to customizing the name of the intermediate table, you may also customize the column names of the keys on the table by passing additional arguments to the `belongsToMany` method. The third argument is the foreign key name of the model on which you are defining the relationship, while the fourth argument is the foreign key name of the model that you are joining to:

```typescript
roles() {
  return this.belongsToMany(Role, 'role_user', 'user_id', 'role_id');
}
```

### Defining the Inverse of the Relationship

To define the "inverse" of a many-to-many relationship, you should define a method on the related model which also returns the result of the `belongsToMany` method:

```typescript
import { Model } from 'guruorm';
import User from './User';

class Role extends Model {
  users() {
    return this.belongsToMany(User);
  }
}
```

### Retrieving Intermediate Table Columns

As you have already learned, working with many-to-many relations requires the presence of an intermediate table. Eloquent provides some very helpful ways of interacting with this table. For example, let's assume our `User` model has many `Role` models that it is related to. After accessing this relationship, we may access the intermediate table using the `pivot` attribute on the models:

```typescript
import User from './models/User';

const user = await User.find(1);

for (const role of await user.roles) {
  console.log(role.pivot.created_at);
}
```

Notice that each `Role` model we retrieve is automatically assigned a `pivot` attribute. This attribute contains a model representing the intermediate table.

By default, only the model keys will be present on the `pivot` model. If your intermediate table contains extra attributes, you must specify them when defining the relationship:

```typescript
roles() {
  return this.belongsToMany(Role).withPivot('active', 'created_by');
}
```

If you would like your intermediate table to have `created_at` and `updated_at` timestamps that are automatically maintained by Eloquent, call the `withTimestamps` method when defining the relationship:

```typescript
roles() {
  return this.belongsToMany(Role).withTimestamps();
}
```

## Eager Loading

When accessing Eloquent relationships as properties, the related models are "lazy loaded". This means the relationship data is not actually loaded until you first access the property. However, Eloquent can "eager load" relationships at the time you query the parent model. Eager loading alleviates the "N + 1" query problem. To illustrate the N + 1 query problem, consider a `Book` model that "belongs to" an `Author` model:

```typescript
import { Model } from 'guruorm';
import Author from './Author';

class Book extends Model {
  author() {
    return this.belongsTo(Author);
  }
}
```

Now, let's retrieve all books and their authors:

```typescript
import Book from './models/Book';

const books = await Book.all();

for (const book of books) {
  console.log(book.author.name);
}
```

This loop will execute one query to retrieve all of the books within the database table, then another query for each book in order to retrieve the book's author. So, if we have 25 books, the code above would run 26 queries: one for the original book, and 25 additional queries to retrieve the author of each book.

Thankfully, we can use eager loading to reduce this operation to just two queries. When building a query, you may specify which relationships should be eager loaded using the `with` method:

```typescript
const books = await Book.with('author').get();

for (const book of books) {
  console.log(book.author.name);
}
```

For this operation, only two queries will be executed - one query to retrieve all of the books and one query to retrieve all of the authors for all of the books:

```sql
select * from books

select * from authors where id in (1, 2, 3, 4, 5, ...)
```

### Eager Loading Multiple Relationships

Sometimes you may need to eager load several different relationships. To do so, just pass an array of relationships to the `with` method:

```typescript
const books = await Book.with(['author', 'publisher']).get();
```

### Nested Eager Loading

To eager load a relationship's relationships, you may use "dot" syntax. For example, let's eager load all of the book's authors and all of the author's personal contacts:

```typescript
const books = await Book.with('author.contacts').get();
```

### Eager Loading Specific Columns

You may not always need every column from the relationships you are retrieving. For this reason, Eloquent allows you to specify which columns of the relationship you would like to retrieve:

```typescript
const books = await Book.with('author:id,name,book_id').get();
```

> **Warning:** When using this feature, you should always include the `id` column and any relevant foreign key columns in the list of columns you wish to retrieve.

### Constraining Eager Loads

Sometimes you may wish to eager load a relationship but also specify additional query conditions for the eager loading query. You can accomplish this by passing an object to the `with` method where the key is a relationship name and the value is a closure that adds additional constraints to the eager loading query:

```typescript
import User from './models/User';

const users = await User.with({
  posts: (query) => query.where('title', 'like', '%code%'),
}).get();
```

## Inserting & Updating Related Models

### The `save` Method

Eloquent provides convenient methods for adding new models to relationships. For example, perhaps you need to add a new comment to a post. Instead of manually setting the `post_id` attribute on the `Comment` model, you may insert the comment using the relationship's `save` method:

```typescript
import Post from './models/Post';
import Comment from './models/Comment';

const post = await Post.find(1);

const comment = new Comment({ message: 'A new comment.' });

await post.comments().save(comment);
```

Notice that we did not access the `comments` relationship as a dynamic property. Instead, we called the `comments` method to obtain an instance of the relationship. The `save` method will automatically add the appropriate `post_id` value to the new `Comment` model.

If you need to save multiple related models, you may use the `saveMany` method:

```typescript
await post.comments().saveMany([
  new Comment({ message: 'A new comment.' }),
  new Comment({ message: 'Another new comment.' }),
]);
```

### The `create` Method

In addition to the `save` and `saveMany` methods, you may also use the `create` method, which accepts an object of attributes, creates a model, and inserts it into the database. The difference between `save` and `create` is that `save` accepts a full Eloquent model instance while `create` accepts a plain object:

```typescript
import Post from './models/Post';

const post = await Post.find(1);

const comment = await post.comments().create({
  message: 'A new comment.',
});
```

You may use the `createMany` method to create multiple related models:

```typescript
await post.comments().createMany([
  { message: 'A new comment.' },
  { message: 'Another new comment.' },
]);
```

### Belongs To Relationships

If you would like to assign a child model to a new parent model, you may use the `associate` method. In this example, the `User` model defines a `belongsTo` relationship to the `Account` model. This `associate` method will set the foreign key on the child model:

```typescript
import Account from './models/Account';
import User from './models/User';

const account = await Account.find(10);

const user = await User.find(1);

user.account().associate(account);

await user.save();
```

To remove a parent model from a child model, you may use the `dissociate` method. This method will set the relationship's foreign key to `null`:

```typescript
user.account().dissociate();

await user.save();
```

### Many To Many Relationships

#### Attaching / Detaching

Eloquent also provides methods to make working with many-to-many relationships more convenient. For example, let's imagine a user can have many roles and a role can have many users. You may use the `attach` method to attach a role to a user by inserting a record in the relationship's intermediate table:

```typescript
import User from './models/User';

const user = await User.find(1);

await user.roles().attach(roleId);
```

When attaching a relationship to a model, you may also pass an object of additional data to be inserted into the intermediate table:

```typescript
await user.roles().attach(roleId, { expires: expiresAt });
```

Sometimes it may be necessary to remove a role from a user. To remove a many-to-many relationship record, use the `detach` method. The `detach` method will delete the appropriate record out of the intermediate table; however, both models will remain in the database:

```typescript
// Detach a single role from the user
await user.roles().detach(roleId);

// Detach all roles from the user
await user.roles().detach();
```

For convenience, `attach` and `detach` also accept arrays of IDs as input:

```typescript
await user.roles().attach([1, 2, 3]);

await user.roles().detach([1, 2, 3]);
```

#### Syncing Associations

You may also use the `sync` method to construct many-to-many associations. The `sync` method accepts an array of IDs to place on the intermediate table. Any IDs that are not in the given array will be removed from the intermediate table. So, after this operation is complete, only the IDs in the given array will exist in the intermediate table:

```typescript
await user.roles().sync([1, 2, 3]);
```

You may also pass additional intermediate table values with the IDs:

```typescript
await user.roles().sync({ 
  1: { expires: true },
  2: { expires: true },
});
```

If you would like to insert the same intermediate table values with each of the synced model IDs, you may use the `syncWithPivotValues` method:

```typescript
await user.roles().syncWithPivotValues([1, 2, 3], { active: true });
```

#### Toggling Associations

The many-to-many relationship also provides a `toggle` method which "toggles" the attachment status of the given related model IDs. If the given ID is currently attached, it will be detached. Likewise, if it is currently detached, it will be attached:

```typescript
await user.roles().toggle([1, 2, 3]);
```

## Touching Parent Timestamps

When a model belongs to another model via a `belongsTo` or `belongsToMany` relationship, such as a `Comment` belonging to a `Post`, it is sometimes helpful to update the parent's timestamp when the child model is updated.

For example, when a `Comment` model is updated, you may want to automatically "touch" the `updated_at` timestamp of the owning `Post` so that it is set to the current date and time. To accomplish this, you may add a `touches` property to your child model containing the names of the relationships that should have their `updated_at` timestamps updated when the child model is updated:

```typescript
import { Model } from 'guruorm';
import Post from './Post';

class Comment extends Model {
  protected touches = ['post'];

  post() {
    return this.belongsTo(Post);
  }
}
```

Now, when you update a `Comment`, the owning `Post` will have its `updated_at` column updated as well, making it more convenient to know when to invalidate a cache of the `Post` model:

```typescript
const comment = await Comment.find(1);

comment.text = 'Edit to this comment!';

await comment.save();
```
