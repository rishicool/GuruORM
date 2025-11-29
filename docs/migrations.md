# Database: Migrations

## Introduction

Migrations are like version control for your database, allowing your team to define and share the application's database schema definition. If you have ever had to tell a teammate to manually add a column to their local database schema after pulling in your changes from source control, you've faced the problem that database migrations solve.

The GuruORM `Schema` builder provides database agnostic support for creating and manipulating tables across all of GuruORM's supported database systems. Typically, migrations will use this builder to create and modify database tables and columns.

## Generating Migrations

You may use the `make:migration` command to generate a database migration. The new migration will be placed in your `database/migrations` directory. Each migration filename contains a timestamp that allows GuruORM to determine the order of the migrations:

```bash
npx guruorm make:migration create_flights_table
```

GuruORM will use the name of the migration to attempt to guess the name of the table and whether or not the migration will be creating a new table. If GuruORM is able to determine the table name from the migration name, GuruORM will pre-fill the generated migration file with the specified table. Otherwise, you may simply specify the table in the migration file manually.

If you would like to specify a custom path for the generated migration, you may use the `--path` option when executing the `make:migration` command. The given path should be relative to your application's base path.

### Squashing Migrations

As you build your application, you may accumulate more and more migrations over time. This can lead to your `database/migrations` directory becoming bloated with potentially hundreds of migrations. If you would like, you may "squash" your migrations into a single SQL file. To get started, execute the `schema:dump` command:

```bash
npx guruorm schema:dump

# Dump the current database schema and prune all existing migrations
npx guruorm schema:dump --prune
```

When you execute this command, GuruORM will write a "schema" file to your application's `database/schema` directory. The schema file's name will correspond to the database connection. Now, when you attempt to migrate your database and no other migrations have been executed, GuruORM will first execute the SQL statements in the schema file of the database connection you are using. After executing the schema file's SQL statements, GuruORM will execute any remaining migrations that were not part of the schema dump.

## Migration Structure

A migration class contains two methods: `up` and `down`. The `up` method is used to add new tables, columns, or indexes to your database, while the `down` method should reverse the operations performed by the `up` method.

Within both of these methods, you may use the GuruORM schema builder to expressively create and modify tables. To learn about all of the methods available on the `Schema` builder, check out its documentation. For example, the following migration creates a `flights` table:

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateFlightsTable extends Migration {
  /**
   * Run the migrations.
   */
  async up(): Promise<void> {
    await Schema.create('flights', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.string('airline');
      table.timestamps();
    });
  }

  /**
   * Reverse the migrations.
   */
  async down(): Promise<void> {
    await Schema.dropIfExists('flights');
  }
}
```

### Setting the Migration Connection

If your migration will be interacting with a database connection other than your application's default database connection, you should set the `connection` property of your migration:

```typescript
export default class CreateFlightsTable extends Migration {
  protected connection = 'pgsql';

  async up(): Promise<void> {
    // ...
  }
}
```

## Running Migrations

To run all of your outstanding migrations, execute the `migrate` command:

```bash
npx guruorm migrate
```

If you would like to see which migrations have run thus far, you may use the `migrate:status` command:

```bash
npx guruorm migrate:status
```

If you would like to see the SQL statements that will be executed by the migrations without actually running them, you may provide the `--pretend` flag to the `migrate` command:

```bash
npx guruorm migrate --pretend
```

### Forcing Migrations to Run in Production

Some migration operations are destructive, which means they may cause you to lose data. In order to protect you from running these commands against your production database, you will be prompted for confirmation before the commands are executed. To force the commands to run without a prompt, use the `--force` flag:

```bash
npx guruorm migrate --force
```

### Rolling Back Migrations

To roll back the latest migration operation, you may use the `rollback` command. This command rolls back the last "batch" of migrations, which may include multiple migration files:

```bash
npx guruorm migrate:rollback
```

You may roll back a limited number of migrations by providing the `step` option to the `rollback` command. For example, the following command will roll back the last five migrations:

```bash
npx guruorm migrate:rollback --step=5
```

The `migrate:reset` command will roll back all of your application's migrations:

```bash
npx guruorm migrate:reset
```

### Roll Back & Migrate Using a Single Command

The `migrate:refresh` command will roll back all of your migrations and then execute the `migrate` command. This command effectively re-creates your entire database:

```bash
npx guruorm migrate:refresh

# Refresh the database and run all database seeds
npx guruorm migrate:refresh --seed
```

You may roll back and re-migrate a limited number of migrations by providing the `step` option to the `refresh` command. For example, the following command will roll back and re-migrate the last five migrations:

```bash
npx guruorm migrate:refresh --step=5
```

### Drop All Tables & Migrate

The `migrate:fresh` command will drop all tables from the database and then execute the `migrate` command:

```bash
npx guruorm migrate:fresh

npx guruorm migrate:fresh --seed
```

> **Warning:** The `migrate:fresh` command will drop all database tables regardless of their prefix. This command should be used with caution when developing on a database that is shared with other applications.

## Tables

### Creating Tables

To create a new database table, use the `create` method on the `Schema` builder. The `create` method accepts two arguments: the first is the name of the table, while the second is a closure which receives a `Blueprint` object that may be used to define the new table:

```typescript
import { Schema, Blueprint } from 'guruorm';

await Schema.create('users', (table: Blueprint) => {
  table.id();
  table.string('name');
  table.string('email');
  table.timestamps();
});
```

When creating the table, you may use any of the schema builder's column methods to define the table's columns.

### Checking for Table / Column Existence

You may check for the existence of a table or column using the `hasTable` and `hasColumn` methods:

```typescript
if (await Schema.hasTable('users')) {
  // The "users" table exists
}

if (await Schema.hasColumn('users', 'email')) {
  // The "users" table exists and has an "email" column
}
```

### Database Connection & Table Options

If you want to perform a schema operation on a database connection that is not your application's default connection, use the `connection` method:

```typescript
await Schema.connection('mysql').create('users', (table) => {
  table.id();
});
```

In addition, a few other properties and methods may be used to define other aspects of the table's creation. The `engine` property may be used to specify the table's storage engine when using MySQL:

```typescript
await Schema.create('users', (table) => {
  table.engine = 'InnoDB';
  
  // ...
});
```

The `charset` and `collation` properties may be used to specify the character set and collation for the created table when using MySQL:

```typescript
await Schema.create('users', (table) => {
  table.charset = 'utf8mb4';
  table.collation = 'utf8mb4_unicode_ci';
  
  // ...
});
```

### Updating Tables

The `table` method on the `Schema` builder may be used to update existing tables. Like the `create` method, the `table` method accepts two arguments: the name of the table and a closure that receives a `Blueprint` instance you may use to add columns or indexes to the table:

```typescript
import { Schema } from 'guruorm';

await Schema.table('users', (table) => {
  table.integer('votes');
});
```

### Renaming / Dropping Tables

To rename an existing database table, use the `rename` method:

```typescript
await Schema.rename('from', 'to');
```

To drop an existing table, you may use the `drop` or `dropIfExists` methods:

```typescript
await Schema.drop('users');

await Schema.dropIfExists('users');
```

## Columns

### Creating Columns

The `table` method on the `Schema` builder may be used to update existing tables. Like the `create` method, the `table` method accepts two arguments: the name of the table and a closure that receives a `Blueprint` instance you may use to add columns to the table:

```typescript
await Schema.table('users', (table) => {
  table.integer('votes');
});
```

### Available Column Types

The schema builder blueprint offers a variety of methods that correspond to the different types of columns you can add to your database tables. Each of the available methods are listed in the table below:

#### String & Text

```typescript
table.char('name', 100);          // CHAR equivalent column
table.string('name', 100);        // VARCHAR equivalent column
table.text('description');        // TEXT equivalent column
table.mediumText('description');  // MEDIUMTEXT equivalent column
table.longText('description');    // LONGTEXT equivalent column
```

#### Numeric

```typescript
table.bigInteger('votes');        // BIGINT equivalent column
table.integer('votes');           // INTEGER equivalent column
table.mediumInteger('votes');     // MEDIUMINT equivalent column
table.smallInteger('votes');      // SMALLINT equivalent column
table.tinyInteger('votes');       // TINYINT equivalent column
table.decimal('amount', 8, 2);    // DECIMAL equivalent column
table.double('amount', 8, 2);     // DOUBLE equivalent column
table.float('amount', 8, 2);      // FLOAT equivalent column
```

#### Date & Time

```typescript
table.date('created_at');         // DATE equivalent column
table.dateTime('created_at', 0);  // DATETIME equivalent column
table.time('sunrise', 0);         // TIME equivalent column
table.timestamp('added_at', 0);   // TIMESTAMP equivalent column
table.timestamps(0);              // Create created_at and updated_at columns
table.softDeletes(0);             // Adds a nullable deleted_at TIMESTAMP column
```

#### Other Types

```typescript
table.boolean('confirmed');       // BOOLEAN equivalent column
table.enum('difficulty', ['easy', 'hard']);  // ENUM equivalent column
table.json('options');            // JSON equivalent column
table.jsonb('options');           // JSONB equivalent column
table.binary('data');             // BLOB equivalent column
table.uuid('id');                 // UUID equivalent column
```

#### Auto-Incrementing IDs

```typescript
table.id();                       // Alias of bigIncrements('id')
table.increments('id');           // Auto-incrementing UNSIGNED INTEGER (primary key)
table.bigIncrements('id');        // Auto-incrementing UNSIGNED BIGINT (primary key)
```

### Column Modifiers

In addition to the column types listed above, there are several column "modifiers" you may use when adding a column to a database table. For example, to make the column "nullable", you may use the `nullable` method:

```typescript
await Schema.table('users', (table) => {
  table.string('email').nullable();
});
```

The following table contains all of the available column modifiers. This list does not include index modifiers:

```typescript
table.string('email').after('password');           // Place column "after" another column (MySQL)
table.string('email').charset('utf8mb4');          // Specify a character set (MySQL)
table.string('email').collation('utf8mb4_unicode_ci'); // Specify a collation (MySQL/PostgreSQL/SQL Server)
table.text('description').comment('my comment');   // Add a comment to a column (MySQL/PostgreSQL)
table.integer('votes').default(0);                 // Specify a "default" value
table.integer('votes').unsigned();                 // Set INTEGER to UNSIGNED (MySQL)
table.bigInteger('votes').autoIncrement();         // Set BIGINT column as auto-increment (primary key)
table.string('email').nullable();                  // Allow NULL values
table.string('name').unique();                     // Add a unique index
table.integer('user_id').index();                  // Add a basic index
```

#### Default Expressions

The `default` modifier accepts a value or an expression. To use an expression, pass a closure:

```typescript
table.timestamp('created_at').default(DB.raw('CURRENT_TIMESTAMP'));
```

### Modifying Columns

The `change` method allows you to modify the type and attributes of existing columns. For example, you may wish to increase the size of a `string` column. To see the `change` method in action, let's increase the size of the `name` column from 25 to 50. To accomplish this, we simply define the new state of the column and then call the `change` method:

```typescript
await Schema.table('users', (table) => {
  table.string('name', 50).change();
});
```

When modifying a column, you must explicitly include all of the modifiers you want to keep on the column definition - any missing attribute will be dropped. For example, to retain the `unsigned`, `default`, and `comment` attributes, you must call each modifier explicitly when changing the column:

```typescript
await Schema.table('users', (table) => {
  table.integer('votes').unsigned().default(1).comment('my comment').change();
});
```

### Renaming Columns

To rename a column, you may use the `renameColumn` method provided by the schema builder:

```typescript
await Schema.table('users', (table) => {
  table.renameColumn('from', 'to');
});
```

### Dropping Columns

To drop a column, you may use the `dropColumn` method on the schema builder:

```typescript
await Schema.table('users', (table) => {
  table.dropColumn('votes');
});
```

You may drop multiple columns from a table by passing an array of column names to the `dropColumn` method:

```typescript
await Schema.table('users', (table) => {
  table.dropColumn(['votes', 'avatar', 'location']);
});
```

## Indexes

### Creating Indexes

The GuruORM schema builder supports several types of indexes. The following example creates a new `email` column and specifies that its values should be unique. To create the index, we can chain the `unique` method onto the column definition:

```typescript
await Schema.table('users', (table) => {
  table.string('email').unique();
});
```

Alternatively, you may create the index after defining the column. To do so, you should call the `unique` method on the schema builder blueprint. This method accepts the name of the column that should receive a unique index:

```typescript
table.unique('email');
```

You may even pass an array of columns to an index method to create a compound (or composite) index:

```typescript
table.index(['account_id', 'created_at']);
```

When creating an index, GuruORM will automatically generate an index name based on the table, column names, and the index type, but you may pass a second argument to the method to specify the index name yourself:

```typescript
table.unique('email', 'unique_email');
```

#### Available Index Types

```typescript
table.primary('id');                      // Adds a primary key
table.primary(['id', 'parent_id']);       // Adds composite keys
table.unique('email');                     // Adds a unique index
table.index('state');                      // Adds an index
table.fullText('body');                    // Adds a full text index (MySQL/PostgreSQL)
table.fullText('body', 'fulltext_body');   // Adds a full text index with a custom name
table.spatialIndex('location');            // Adds a spatial index (except SQLite)
```

### Renaming Indexes

To rename an index, you may use the `renameIndex` method provided by the schema builder blueprint. This method accepts the current index name as its first argument and the desired new name as its second argument:

```typescript
table.renameIndex('from', 'to');
```

### Dropping Indexes

To drop an index, you must specify the index's name. By default, GuruORM automatically assigns an index name based on the table name, the name of the indexed column, and the index type. Here are some examples:

```typescript
table.dropPrimary('users_id_primary');     // Drop a primary key from the "users" table
table.dropUnique('users_email_unique');    // Drop a unique index from the "users" table
table.dropIndex('geo_state_index');        // Drop a basic index from the "geo" table
table.dropFullText('posts_body_fulltext'); // Drop a full text index from the "posts" table
table.dropSpatialIndex('geo_location_spatialindex'); // Drop a spatial index from the "geo" table (except SQLite)
```

If you pass an array of columns into a method that drops indexes, the conventional index name will be generated based on the table name, columns, and index type:

```typescript
await Schema.table('geo', (table) => {
  table.dropIndex(['state']); // Drops index 'geo_state_index'
});
```

## Foreign Key Constraints

GuruORM also provides support for creating foreign key constraints, which are used to force referential integrity at the database level. For example, let's define a `user_id` column on the `posts` table that references the `id` column on a `users` table:

```typescript
await Schema.create('posts', (table) => {
  table.id();
  table.bigInteger('user_id').unsigned();
  table.foreign('user_id').references('id').on('users');
});
```

Since this syntax is rather verbose, GuruORM provides additional, terser methods that use conventions to provide a better developer experience. When using the `foreignId` method to create your column, the example above can be rewritten like so:

```typescript
await Schema.create('posts', (table) => {
  table.id();
  table.foreignId('user_id').constrained();
});
```

The `foreignId` method creates a `BIGINT UNSIGNED` equivalent column, while the `constrained` method will use conventions to determine the table and column being referenced. If your table name does not match GuruORM's conventions, you may specify the table name by passing it as an argument to the `constrained` method:

```typescript
table.foreignId('user_id').constrained('users');
```

You may also specify the desired action for the "on delete" and "on update" properties of the constraint:

```typescript
table.foreignId('user_id')
     .constrained()
     .onUpdate('cascade')
     .onDelete('cascade');
```

Any additional column modifiers must be called before the `constrained` method:

```typescript
table.foreignId('user_id')
     .nullable()
     .constrained();
```

### Dropping Foreign Keys

To drop a foreign key, you may use the `dropForeign` method, passing the name of the foreign key constraint to be deleted as an argument. Foreign key constraints use the same naming convention as indexes. In other words, the foreign key constraint name is based on the name of the table and the columns in the constraint, followed by a "_foreign" suffix:

```typescript
table.dropForeign('posts_user_id_foreign');
```

Alternatively, you may pass an array containing the column name that holds the foreign key to the `dropForeign` method. The array will be converted to a foreign key constraint name using GuruORM's constraint naming conventions:

```typescript
table.dropForeign(['user_id']);
```

### Toggling Foreign Key Constraints

You may enable or disable foreign key constraints within your migrations by using the following methods:

```typescript
await Schema.enableForeignKeyConstraints();

await Schema.disableForeignKeyConstraints();
```

> **Note:** SQLite disables foreign key constraints by default. When using SQLite, make sure to enable foreign key support in your database configuration before attempting to create them in your migrations.
