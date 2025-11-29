# Database: Query Builder

## Introduction

GuruORM's database query builder provides a convenient, fluent interface to creating and running database queries. It can be used to perform most database operations in your application and works perfectly with all supported database systems.

The query builder uses parameter binding to protect your application against SQL injection attacks. There is no need to clean or sanitize strings passed to the query builder as query bindings.

> **Note:** The query builder brings elegant database layer to Node.js.

## Running Database Queries

### Retrieving All Rows From a Table

You may use the `table()` method provided by the `DB` class to begin a query. The `table()` method returns a fluent query builder instance for the given table, allowing you to chain more constraints onto the query and then finally retrieve the results of the query using the `get()` method:

```typescript
import { DB } from 'guruorm';

const users = await DB.table('users').get();
```

The `get()` method returns a collection containing the results of the query where each result is an object. You may access each column's value by accessing the column as a property of the object:

```typescript
for (const user of users) {
  console.log(user.name);
}
```

### Retrieving a Single Row / Column From a Table

If you just need to retrieve a single row from a database table, you may use the `first()` method. This method will return a single object:

```typescript
const user = await DB.table('users').where('name', 'John').first();

console.log(user.name);
```

If you don't need an entire row, you may extract a single value from a record using the `value()` method. This method will return the value of the column directly:

```typescript
const email = await DB.table('users').where('name', 'John').value('email');
```

To retrieve a single row by its `id` column value, use the `find()` method:

```typescript
const user = await DB.table('users').find(3);
```

### Retrieving a List of Column Values

If you would like to retrieve a collection containing the values of a single column, you may use the `pluck()` method. In this example, we'll retrieve a collection of user names:

```typescript
const names = await DB.table('users').pluck('name');

for (const name of names) {
  console.log(name);
}
```

You may specify the column that the resulting collection should use as its keys by providing a second argument to the `pluck()` method:

```typescript
const names = await DB.table('users').pluck('name', 'id');

console.log(names[1]); // Name of user with ID 1
```

### Chunking Results

If you need to work with thousands of database records, consider using the `chunk()` method. This method retrieves a small chunk of results at a time and feeds each chunk into a closure for processing. For example, let's retrieve the entire `users` table in chunks of 100 records at a time:

```typescript
await DB.table('users').chunk(100, async (users) => {
  for (const user of users) {
    // Process user
  }
});
```

You may stop further chunks from being processed by returning `false` from the closure:

```typescript
await DB.table('users').chunk(100, async (users) => {
  // Process the users...
  
  return false;
});
```

If you are updating database records while chunking results, your chunk results could change in unexpected ways. If you plan to update the retrieved records while chunking, it is always best to use the `chunkById()` method instead:

```typescript
await DB.table('users').chunkById(100, async (users) => {
  for (const user of users) {
    await DB.table('users')
      .where('id', user.id)
      .update({ processed: true });
  }
});
```

### Streaming Results Lazily

The `lazy()` method works similarly to the `chunk()` method in the sense that it executes the query in chunks. However, instead of passing each chunk into a callback, the `lazy()` method returns a generator, allowing you to interact with the results as a single stream:

```typescript
for await (const user of DB.table('users').lazy()) {
  // Process user
}
```

Once again, if you plan to update the retrieved records while iterating over them, it is best to use the `lazyById()` method instead:

```typescript
for await (const user of DB.table('users').lazyById()) {
  await DB.table('users')
    .where('id', user.id)
    .update({ processed: true });
}
```

### Aggregates

The query builder also provides a variety of methods for retrieving aggregate values like `count`, `max`, `min`, `avg`, and `sum`. You may call any of these methods after constructing your query:

```typescript
const count = await DB.table('users').count();

const price = await DB.table('orders').max('price');

const price = await DB.table('orders').min('price');

const price = await DB.table('orders').avg('price');

const total = await DB.table('orders').sum('price');
```

#### Determining if Records Exist

Instead of using the `count()` method to determine if any records exist that match your query's constraints, you may use the `exists()` and `doesntExist()` methods:

```typescript
if (await DB.table('orders').where('finalized', 1).exists()) {
  // Records exist
}

if (await DB.table('orders').where('finalized', 1).doesntExist()) {
  // No records exist
}
```

## Select Statements

### Specifying a Select Clause

You may not always want to select all columns from a database table. Using the `select()` method, you can specify a custom `select` clause for the query:

```typescript
const users = await DB.table('users')
  .select('name', 'email as user_email')
  .get();
```

The `distinct()` method allows you to force the query to return distinct results:

```typescript
const users = await DB.table('users').distinct().get();
```

If you already have a query builder instance and you wish to add a column to its existing select clause, you may use the `addSelect()` method:

```typescript
const query = DB.table('users').select('name');

const users = await query.addSelect('age').get();
```

### Raw Expressions

Sometimes you may need to insert an arbitrary string into a query. To create a raw string expression, you may use the `raw()` method provided by the `DB` class:

```typescript
const users = await DB.table('users')
  .select(DB.raw('count(*) as user_count, status'))
  .where('status', '<>', 1)
  .groupBy('status')
  .get();
```

> **Warning:** Raw statements will be injected into the query as strings, so you should be extremely careful to avoid creating SQL injection vulnerabilities.

### Raw Methods

Instead of using the `DB.raw()` method, you may also use the following methods to insert a raw expression into various parts of your query. **Remember, GuruORM cannot guarantee that any query using raw expressions is protected against SQL injection vulnerabilities.**

#### `selectRaw`

The `selectRaw()` method can be used in place of `addSelect(DB.raw(...))`. This method accepts an optional array of bindings as its second argument:

```typescript
const orders = await DB.table('orders')
  .selectRaw('price * ? as price_with_tax', [1.0825])
  .get();
```

#### `whereRaw / orWhereRaw`

The `whereRaw()` and `orWhereRaw()` methods can be used to inject a raw `where` clause into your query. These methods accept an optional array of bindings as their second argument:

```typescript
const orders = await DB.table('orders')
  .whereRaw('price > IF(state = "TX", ?, 100)', [200])
  .get();
```

#### `havingRaw / orHavingRaw`

The `havingRaw()` and `orHavingRaw()` methods may be used to provide a raw string as the value of the `having` clause:

```typescript
const orders = await DB.table('orders')
  .select('department', DB.raw('SUM(price) as total_sales'))
  .groupBy('department')
  .havingRaw('SUM(price) > ?', [2500])
  .get();
```

#### `orderByRaw`

The `orderByRaw()` method may be used to provide a raw string as the value of the `order by` clause:

```typescript
const orders = await DB.table('orders')
  .orderByRaw('updated_at - created_at DESC')
  .get();
```

#### `groupByRaw`

The `groupByRaw()` method may be used to provide a raw string as the value of the `group by` clause:

```typescript
const orders = await DB.table('orders')
  .select('city', 'state')
  .groupByRaw('city, state')
  .get();
```

## Joins

### Inner Join Clause

The query builder may also be used to add join clauses to your queries. To perform a basic "inner join", you may use the `join()` method on a query builder instance. The first argument passed to the `join()` method is the name of the table you need to join to, while the remaining arguments specify the column constraints for the join:

```typescript
const users = await DB.table('users')
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .join('orders', 'users.id', '=', 'orders.user_id')
  .select('users.*', 'contacts.phone', 'orders.price')
  .get();
```

### Left Join / Right Join Clause

If you would like to perform a "left join" or "right join" instead of an "inner join", use the `leftJoin()` or `rightJoin()` methods. These methods have the same signature as the `join()` method:

```typescript
const users = await DB.table('users')
  .leftJoin('posts', 'users.id', '=', 'posts.user_id')
  .get();

const users = await DB.table('users')
  .rightJoin('posts', 'users.id', '=', 'posts.user_id')
  .get();
```

### Cross Join Clause

You may use the `crossJoin()` method to perform a "cross join". Cross joins generate a cartesian product between the first table and the joined table:

```typescript
const sizes = await DB.table('sizes')
  .crossJoin('colors')
  .get();
```

### Advanced Join Clauses

You may also specify more advanced join clauses. To get started, pass a closure as the second argument to the `join()` method. The closure will receive a `JoinClause` instance which allows you to specify constraints on the `join` clause:

```typescript
await DB.table('users')
  .join('contacts', (join) => {
    join.on('users.id', '=', 'contacts.user_id')
        .orOn('users.id', '=', 'contacts.admin_id');
  })
  .get();
```

If you would like to use a "where" clause on your joins, you may use the `where()` and `orWhere()` methods provided by the `JoinClause` instance:

```typescript
await DB.table('users')
  .join('contacts', (join) => {
    join.on('users.id', '=', 'contacts.user_id')
        .where('contacts.user_id', '>', 5);
  })
  .get();
```

### Subquery Joins

You may use the `joinSub()`, `leftJoinSub()`, and `rightJoinSub()` methods to join a query to a subquery. Each of these methods receives three arguments: the subquery, its table alias, and a closure that defines the related columns:

```typescript
const latestPosts = DB.table('posts')
  .select('user_id', DB.raw('MAX(created_at) as last_post_created_at'))
  .where('is_published', true)
  .groupBy('user_id');

const users = await DB.table('users')
  .joinSub(latestPosts, 'latest_posts', (join) => {
    join.on('users.id', '=', 'latest_posts.user_id');
  })
  .get();
```

## Unions

The query builder also provides a convenient method to "union" two or more queries together. For example, you may create an initial query and use the `union()` method to union it with more queries:

```typescript
const first = DB.table('users')
  .whereNull('first_name');

const users = await DB.table('users')
  .whereNull('last_name')
  .union(first)
  .get();
```

In addition to the `union()` method, the query builder provides a `unionAll()` method. Queries that are combined using the `unionAll()` method will not have their duplicate results removed:

```typescript
const users = await first.unionAll(second).get();
```

## Basic Where Clauses

### Where Clauses

You may use the query builder's `where()` method to add "where" clauses to the query. The most basic call to the `where()` method requires three arguments. The first argument is the name of the column. The second argument is an operator, which can be any of the database's supported operators. The third argument is the value to compare against the column's value:

```typescript
const users = await DB.table('users')
  .where('votes', '=', 100)
  .get();
```

For convenience, if you want to verify that a column is equal to a given value, you may pass the value as the second argument to the `where()` method. GuruORM will assume you would like to use the `=` operator:

```typescript
const users = await DB.table('users')
  .where('votes', 100)
  .get();
```

As previously mentioned, you may use any operator that is supported by your database system:

```typescript
const users = await DB.table('users')
  .where('votes', '>=', 100)
  .get();

const users = await DB.table('users')
  .where('votes', '<>', 100)
  .get();

const users = await DB.table('users')
  .where('name', 'like', 'T%')
  .get();
```

You may also pass an array of conditions to the `where()` function. Each element of the array should be an array containing the three arguments typically passed to the `where()` method:

```typescript
const users = await DB.table('users').where([
  ['status', '=', '1'],
  ['subscribed', '<>', '1'],
]).get();
```

### Or Where Clauses

When chaining together calls to the query builder's `where()` method, the "where" clauses will be joined together using the `and` operator. However, you may use the `orWhere()` method to join a clause to the query using the `or` operator:

```typescript
const users = await DB.table('users')
  .where('votes', '>', 100)
  .orWhere('name', 'John')
  .get();
```

If you need to group an "or" condition within parentheses, you may pass a closure as the first argument to the `orWhere()` method:

```typescript
const users = await DB.table('users')
  .where('votes', '>', 100)
  .orWhere((query) => {
    query.where('name', 'Abigail')
         .where('votes', '>', 50);
  })
  .get();
```

The example above will produce the following SQL:

```sql
select * from users where votes > 100 or (name = 'Abigail' and votes > 50)
```

### Where Not Clauses

The `whereNot()` and `orWhereNot()` methods may be used to negate a given group of query constraints:

```typescript
const users = await DB.table('users')
  .whereNot((query) => {
    query.where('votes', '>', 100)
         .whereNot('name', 'Abigail');
  })
  .get();
```

### JSON Where Clauses

GuruORM supports querying JSON column types on databases that provide support for JSON column types. Currently, this includes MySQL 5.7+, PostgreSQL, and SQL Server. To query a JSON column, use the `->` operator:

```typescript
const users = await DB.table('users')
  .where('preferences->dining->meal', 'salad')
  .get();
```

### Additional Where Clauses

**whereBetween / orWhereBetween**

The `whereBetween()` method verifies that a column's value is between two values:

```typescript
const users = await DB.table('users')
  .whereBetween('votes', [1, 100])
  .get();
```

**whereNotBetween / orWhereNotBetween**

The `whereNotBetween()` method verifies that a column's value lies outside of two values:

```typescript
const users = await DB.table('users')
  .whereNotBetween('votes', [1, 100])
  .get();
```

**whereIn / whereNotIn / orWhereIn / orWhereNotIn**

The `whereIn()` method verifies that a given column's value is contained within the given array:

```typescript
const users = await DB.table('users')
  .whereIn('id', [1, 2, 3])
  .get();
```

The `whereNotIn()` method verifies that the given column's value is not contained in the given array:

```typescript
const users = await DB.table('users')
  .whereNotIn('id', [1, 2, 3])
  .get();
```

**whereNull / whereNotNull / orWhereNull / orWhereNotNull**

The `whereNull()` method verifies that the value of the given column is `NULL`:

```typescript
const users = await DB.table('users')
  .whereNull('updated_at')
  .get();
```

The `whereNotNull()` method verifies that the column's value is not `NULL`:

```typescript
const users = await DB.table('users')
  .whereNotNull('updated_at')
  .get();
```

**whereDate / whereMonth / whereDay / whereYear / whereTime**

The `whereDate()` method may be used to compare a column's value against a date:

```typescript
const users = await DB.table('users')
  .whereDate('created_at', '2016-12-31')
  .get();
```

The `whereMonth()` method may be used to compare a column's value against a specific month:

```typescript
const users = await DB.table('users')
  .whereMonth('created_at', '12')
  .get();
```

The `whereDay()` method may be used to compare a column's value against a specific day of the month:

```typescript
const users = await DB.table('users')
  .whereDay('created_at', '31')
  .get();
```

The `whereYear()` method may be used to compare a column's value against a specific year:

```typescript
const users = await DB.table('users')
  .whereYear('created_at', '2016')
  .get();
```

The `whereTime()` method may be used to compare a column's value against a specific time:

```typescript
const users = await DB.table('users')
  .whereTime('created_at', '=', '11:20:45')
  .get();
```

**whereColumn / orWhereColumn**

The `whereColumn()` method may be used to verify that two columns are equal:

```typescript
const users = await DB.table('users')
  .whereColumn('first_name', 'last_name')
  .get();
```

You may also pass a comparison operator to the `whereColumn()` method:

```typescript
const users = await DB.table('users')
  .whereColumn('updated_at', '>', 'created_at')
  .get();
```

## Ordering, Grouping, Limit & Offset

### Ordering

#### The `orderBy` Method

The `orderBy()` method allows you to sort the results of the query by a given column. The first argument accepted by the `orderBy()` method should be the column you wish to sort by, while the second argument determines the direction of the sort and may be either `asc` or `desc`:

```typescript
const users = await DB.table('users')
  .orderBy('name', 'desc')
  .get();
```

To sort by multiple columns, you may simply invoke `orderBy()` as many times as necessary:

```typescript
const users = await DB.table('users')
  .orderBy('name', 'desc')
  .orderBy('email', 'asc')
  .get();
```

#### The `latest` & `oldest` Methods

The `latest()` and `oldest()` methods allow you to easily order results by date. By default, the result will be ordered by the table's `created_at` column. Or, you may pass the column name that you wish to sort by:

```typescript
const user = await DB.table('users')
  .latest()
  .first();
```

#### Random Ordering

The `inRandomOrder()` method may be used to sort the query results randomly. For example, you may use this method to fetch a random user:

```typescript
const randomUser = await DB.table('users')
  .inRandomOrder()
  .first();
```

#### Removing Existing Orderings

The `reorder()` method removes all of the "order by" clauses that have previously been applied to the query:

```typescript
const query = DB.table('users').orderBy('name');

const unorderedUsers = await query.reorder().get();
```

You may pass a column and direction when calling the `reorder()` method in order to remove all existing "order by" clauses and apply an entirely new order to the query:

```typescript
const query = DB.table('users').orderBy('name');

const usersOrderedByEmail = await query.reorder('email', 'desc').get();
```

### Grouping

#### The `groupBy` & `having` Methods

As you might expect, the `groupBy()` and `having()` methods may be used to group the query results. The `having()` method's signature is similar to that of the `where()` method:

```typescript
const users = await DB.table('users')
  .groupBy('account_id')
  .having('account_id', '>', 100)
  .get();
```

You may use the `havingBetween()` method to filter the results within a given range:

```typescript
const report = await DB.table('orders')
  .selectRaw('count(id) as number_of_orders, customer_id')
  .groupBy('customer_id')
  .havingBetween('number_of_orders', [5, 15])
  .get();
```

You may pass multiple arguments to the `groupBy()` method to group by multiple columns:

```typescript
const users = await DB.table('users')
  .groupBy('first_name', 'status')
  .having('account_id', '>', 100)
  .get();
```

### Limit & Offset

#### The `skip` & `take` Methods

You may use the `skip()` and `take()` methods to limit the number of results returned from the query or to skip a given number of results in the query:

```typescript
const users = await DB.table('users')
  .skip(10)
  .take(5)
  .get();
```

Alternatively, you may use the `limit()` and `offset()` methods. These methods are functionally equivalent to the `take()` and `skip()` methods, respectively:

```typescript
const users = await DB.table('users')
  .offset(10)
  .limit(5)
  .get();
```

## Insert Statements

The query builder also provides an `insert()` method that may be used to insert records into the database table. The `insert()` method accepts an object of column names and values:

```typescript
await DB.table('users').insert({
  email: 'kayla@example.com',
  votes: 0,
});
```

You may insert several records at once by passing an array of objects. Each object represents a row to be inserted into the table:

```typescript
await DB.table('users').insert([
  { email: 'picard@example.com', votes: 0 },
  { email: 'janeway@example.com', votes: 0 },
]);
```

### Auto-Incrementing IDs

If the table has an auto-incrementing id, use the `insertGetId()` method to insert a record and then retrieve the ID:

```typescript
const id = await DB.table('users').insertGetId({
  email: 'john@example.com',
  votes: 0,
});
```

### Upserts

The `upsert()` method will insert rows that do not exist and update the rows that already exist with new values that you may specify. The method's first argument consists of the values to insert or update, while the second argument lists the column(s) that uniquely identify records within the associated table. The method's third and final argument is an array of columns that should be updated if a matching record already exists in the database:

```typescript
await DB.table('flights').upsert(
  [
    { departure: 'Oakland', destination: 'San Diego', price: 99 },
    { departure: 'Chicago', destination: 'New York', price: 150 },
  ],
  ['departure', 'destination'],
  ['price']
);
```

## Update Statements

In addition to inserting records into the database, the query builder can also update existing records using the `update()` method. The `update()` method, like the `insert()` method, accepts an object of column and value pairs indicating the columns to be updated:

```typescript
const affected = await DB.table('users')
  .where('id', 1)
  .update({ votes: 1 });
```

### Increment & Decrement

The query builder also provides convenient methods for incrementing or decrementing the value of a given column. Both of these methods accept at least one argument: the column to modify. A second argument may be provided to specify the amount by which the column should be incremented or decremented:

```typescript
await DB.table('users').increment('votes');

await DB.table('users').increment('votes', 5);

await DB.table('users').decrement('votes');

await DB.table('users').decrement('votes', 5);
```

You may also specify additional columns to update during the operation:

```typescript
await DB.table('users').increment('votes', 1, { name: 'John' });
```

## Delete Statements

The query builder's `delete()` method may be used to delete records from the table. You may constrain `delete` statements by adding "where" clauses before calling the `delete()` method:

```typescript
await DB.table('users').delete();

await DB.table('users').where('votes', '>', 100).delete();
```

If you wish to truncate an entire table, which will remove all records from the table and reset the auto-incrementing ID to zero, you may use the `truncate()` method:

```typescript
await DB.table('users').truncate();
```

## Pessimistic Locking

The query builder also includes a few functions to help you achieve "pessimistic locking" when executing your `select` statements. To execute a statement with a "shared lock", you may call the `sharedLock()` method. A shared lock prevents the selected rows from being modified until your transaction is committed:

```typescript
const users = await DB.table('users')
  .where('votes', '>', 100)
  .sharedLock()
  .get();
```

Alternatively, you may use the `lockForUpdate()` method. A "for update" lock prevents the selected records from being modified or from being selected with another shared lock:

```typescript
const users = await DB.table('users')
  .where('votes', '>', 100)
  .lockForUpdate()
  .get();
```

## Debugging

You may use the `dd()` and `dump()` methods while building a query to dump the current query bindings and SQL. The `dd()` method will display the debug information and then stop executing the request. The `dump()` method will display the debug information but allow the request to continue executing:

```typescript
DB.table('users').where('votes', '>', 100).dd();

DB.table('users').where('votes', '>', 100).dump();
```
