# Advanced Features

## Introduction

This guide covers advanced GuruORM features for building production-ready applications, including transactions, connection pooling, raw queries, query logging, and performance optimization.

## Database Transactions

### Introduction

Database transactions provide a way to group several database operations into a single unit of work. If any operation within the transaction fails, all operations are rolled back, ensuring data integrity.

### Using Transactions

You may use the `transaction()` method on the `DB` class to run a set of operations within a database transaction. If an exception is thrown within the transaction closure, the transaction will automatically be rolled back and the exception will be re-thrown. If the closure executes successfully, the transaction will automatically be committed:

```typescript
import { DB } from 'guruorm';

await DB.transaction(async (trx) => {
  await trx.table('users').insert({
    name: 'John Doe',
    email: 'john@example.com',
  });

  await trx.table('profiles').insert({
    user_id: 1,
    bio: 'Software developer',
  });
});
```

### Manually Using Transactions

If you would like to begin a transaction manually and have complete control over rollbacks and commits, you may use the `beginTransaction()` method:

```typescript
import { DB } from 'guruorm';

const connection = DB.connection();

try {
  await connection.beginTransaction();

  // Perform database operations
  await DB.table('users').insert({ name: 'John' });
  await DB.table('orders').insert({ user_id: 1, total: 100 });

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}
```

### Nested Transactions (Savepoints)

GuruORM supports nested transactions using database savepoints. This allows you to rollback a portion of a transaction without affecting the entire transaction:

```typescript
await DB.transaction(async (trx) => {
  await trx.table('users').insert({ name: 'John' });

  try {
    await trx.transaction(async (trx2) => {
      await trx2.table('orders').insert({ user_id: 1, total: 100 });
      throw new Error('Something went wrong');
    });
  } catch (error) {
    // Orders insert rolled back, but users insert remains
    console.log('Nested transaction failed');
  }

  await trx.table('profiles').insert({ user_id: 1 });
});
```

### Transaction Isolation Levels

You can set the transaction isolation level for better concurrency control:

```typescript
import { DB } from 'guruorm';

const connection = DB.connection();

// Set isolation level
await connection.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

await DB.transaction(async (trx) => {
  // Your transaction code
});
```

Supported isolation levels:
- `READ UNCOMMITTED`
- `READ COMMITTED` (default)
- `REPEATABLE READ`
- `SERIALIZABLE`

### Transaction Best Practices

1. **Keep transactions short** - Long-running transactions can lock rows and reduce concurrency
2. **Avoid external API calls** - Don't make HTTP requests within transactions
3. **Handle errors properly** - Always catch and handle transaction errors
4. **Use savepoints for complex logic** - Nested transactions help with partial rollbacks

```typescript
// Good: Short transaction
await DB.transaction(async (trx) => {
  const user = await trx.table('users').insert({ name: 'John' });
  await trx.table('profiles').insert({ user_id: user.id });
});

// Bad: Transaction with external API call
await DB.transaction(async (trx) => {
  const user = await trx.table('users').insert({ name: 'John' });
  await fetch('https://api.example.com/notify'); // DON'T DO THIS!
  await trx.table('profiles').insert({ user_id: user.id });
});
```

## Connection Pooling

### Introduction

Connection pooling reuses database connections instead of creating new ones for each query, significantly improving performance in production applications.

### Configuring Connection Pools

Configure connection pooling when setting up your database connection:

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'password',
  pool: {
    min: 2,                    // Minimum pool size
    max: 10,                   // Maximum pool size
    acquireTimeoutMillis: 30000, // Timeout for acquiring connection
    idleTimeoutMillis: 30000,    // How long a connection can be idle
    createTimeoutMillis: 3000,   // Timeout for creating new connection
    reapIntervalMillis: 1000,    // How often to check for idle connections
  },
});

capsule.setAsGlobal();
capsule.bootEloquent();
```

### Pool Configuration Options

- **min**: Minimum number of connections to maintain
- **max**: Maximum number of connections allowed
- **acquireTimeoutMillis**: Maximum time to wait for a connection
- **idleTimeoutMillis**: Maximum time a connection can remain idle
- **createTimeoutMillis**: Maximum time to wait when creating a new connection
- **reapIntervalMillis**: How often to check for connections to dispose

### Monitoring Connection Pool

You can monitor your connection pool to ensure it's properly configured:

```typescript
const pool = capsule.connection().getPool();

console.log('Total connections:', pool.numUsed() + pool.numFree());
console.log('Used connections:', pool.numUsed());
console.log('Free connections:', pool.numFree());
console.log('Pending acquires:', pool.numPendingAcquires());
```

### Production Pool Settings

Recommended settings for production:

```typescript
// For web applications with moderate traffic
pool: {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
}

// For high-traffic applications
pool: {
  min: 5,
  max: 50,
  acquireTimeoutMillis: 60000,
  idleTimeoutMillis: 10000,
}

// For background workers
pool: {
  min: 1,
  max: 5,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
}
```

## Raw Queries

### Introduction

While GuruORM's query builder provides a fluent interface for most database operations, you sometimes need to execute raw SQL queries.

### Raw Select Queries

Use the `raw()` method to execute raw SELECT queries:

```typescript
import { DB } from 'guruorm';

const users = await DB.raw('SELECT * FROM users WHERE age > ?', [18]);

console.log(users);
```

### Raw Insert/Update/Delete

Execute raw data manipulation queries:

```typescript
// Insert
await DB.raw(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['John Doe', 'john@example.com']
);

// Update
await DB.raw(
  'UPDATE users SET status = ? WHERE last_login < ?',
  ['inactive', '2024-01-01']
);

// Delete
await DB.raw('DELETE FROM logs WHERE created_at < NOW() - INTERVAL 90 DAY');
```

### Raw Query with Named Bindings

Some databases support named parameters:

```typescript
// PostgreSQL
await DB.raw(
  'SELECT * FROM users WHERE name = :name AND age > :age',
  { name: 'John', age: 18 }
);
```

### Database-Specific Features

Use raw queries to access database-specific features:

```typescript
// PostgreSQL: Full-text search
await DB.raw(`
  SELECT * FROM articles
  WHERE to_tsvector('english', content) @@ to_tsquery('database & performance')
`);

// MySQL: REGEXP search
await DB.raw(
  "SELECT * FROM products WHERE name REGEXP ?",
  ['^[A-Z]']
);

// PostgreSQL: JSON operations
await DB.raw(`
  SELECT data->>'name' as name
  FROM users
  WHERE data @> '{"active": true}'
`);
```

### Raw Queries in Transactions

Raw queries work seamlessly within transactions:

```typescript
await DB.transaction(async (trx) => {
  await trx.raw('SET @user_id = LAST_INSERT_ID()');
  await trx.raw('INSERT INTO users (name) VALUES (?)', ['John']);
  await trx.raw('INSERT INTO profiles (user_id) VALUES (@user_id)');
});
```

## Query Logging

### Enabling Query Logging

Enable query logging to debug and optimize your database queries:

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: 'postgres',
  host: 'localhost',
  database: 'myapp',
  username: 'postgres',
  password: 'password',
  debug: true, // Enable query logging
});
```

### Custom Query Logger

Implement a custom query logger for more control:

```typescript
import { QueryLogger } from 'guruorm';

class CustomQueryLogger extends QueryLogger {
  log(query: string, bindings: any[], duration: number): void {
    console.log('Query:', query);
    console.log('Bindings:', bindings);
    console.log('Duration:', duration, 'ms');
    
    // Log slow queries to a file
    if (duration > 1000) {
      this.logSlowQuery(query, bindings, duration);
    }
  }

  private logSlowQuery(query: string, bindings: any[], duration: number): void {
    const fs = require('fs');
    const logEntry = {
      timestamp: new Date().toISOString(),
      query,
      bindings,
      duration,
    };
    fs.appendFileSync('slow-queries.log', JSON.stringify(logEntry) + '\n');
  }
}

// Use custom logger
capsule.setQueryLogger(new CustomQueryLogger());
```

### Logging Only in Development

Only enable logging in development:

```typescript
capsule.addConnection({
  // ... other config
  debug: process.env.NODE_ENV === 'development',
});
```

## Performance Optimization

### 1. Use Eager Loading

Avoid N+1 query problems by eager loading relationships:

```typescript
// Bad: N+1 queries
const users = await User.all();
for (const user of users) {
  console.log(await user.posts); // Separate query for each user
}

// Good: 2 queries total
const users = await User.with('posts').get();
for (const user of users) {
  console.log(user.posts); // Already loaded
}
```

### 2. Select Only Needed Columns

Don't select all columns if you only need a few:

```typescript
// Bad: Selects all columns
const users = await User.get();

// Good: Selects only needed columns
const users = await User.select('id', 'name', 'email').get();
```

### 3. Use Chunking for Large Datasets

Process large datasets in chunks to avoid memory issues:

```typescript
// Bad: Loads all records into memory
const users = await User.all();
for (const user of users) {
  await processUser(user);
}

// Good: Processes in chunks
await User.chunk(1000, async (users) => {
  for (const user of users) {
    await processUser(user);
  }
});
```

### 4. Index Your Columns

Ensure frequently queried columns have indexes:

```typescript
// In migration
await Schema.table('users', (table) => {
  table.index('email'); // Add index for email lookups
  table.index('status'); // Add index for status filtering
  table.index(['created_at', 'status']); // Composite index
});
```

### 5. Use Database-Level Defaults

Let the database handle defaults instead of the application:

```typescript
// In migration
table.timestamp('created_at').defaultTo(DB.raw('CURRENT_TIMESTAMP'));
table.string('status').defaultTo('active');
```

### 6. Pagination Over Offset

For large offsets, use cursor pagination instead of offset-based:

```typescript
// Bad: Slow for large offsets
const users = await User.offset(10000).limit(10).get();

// Good: Fast with cursor
const users = await User.cursorPaginate(10, lastCursor);
```

### 7. Avoid Select * in Production

Always specify columns explicitly:

```typescript
// Bad
await DB.table('users').select('*').get();

// Good
await DB.table('users').select('id', 'name', 'email').get();
```

### 8. Use Read Replicas

Configure read replicas for scaling:

```typescript
capsule.addConnection({
  driver: 'postgres',
  host: 'localhost',
  database: 'myapp',
  username: 'postgres',
  password: 'password',
  replication: {
    write: {
      host: 'master.example.com',
    },
    read: [
      { host: 'replica1.example.com' },
      { host: 'replica2.example.com' },
    ],
  },
});
```

## Production Best Practices

### 1. Environment-Based Configuration

Use environment variables for all configuration:

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: process.env.DB_DRIVER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
  },
  debug: process.env.DB_DEBUG === 'true',
});
```

### 2. Health Checks

Implement database health checks:

```typescript
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await DB.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// In your health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  
  if (dbHealthy) {
    res.status(200).json({ status: 'ok', database: 'connected' });
  } else {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});
```

### 3. Graceful Shutdown

Properly close database connections on shutdown:

```typescript
async function gracefulShutdown() {
  console.log('Closing database connections...');
  await capsule.destroy();
  console.log('Database connections closed');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### 4. Error Handling

Implement comprehensive error handling:

```typescript
try {
  await User.create({ email: 'duplicate@example.com' });
} catch (error) {
  if (error.code === '23505') { // PostgreSQL unique violation
    console.error('Email already exists');
  } else if (error.code === '23503') { // Foreign key violation
    console.error('Referenced record does not exist');
  } else {
    console.error('Database error:', error);
  }
}
```

### 5. Connection Retry Logic

Implement retry logic for database connections:

```typescript
async function connectWithRetry(maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await capsule.testConnection();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error.message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw new Error('Failed to connect to database after multiple retries');
      }
    }
  }
}

// Use during application startup
await connectWithRetry();
```

### 6. Monitoring and Alerts

Monitor key database metrics:

```typescript
import { Capsule } from 'guruorm';

setInterval(() => {
  const pool = capsule.connection().getPool();
  
  const metrics = {
    totalConnections: pool.numUsed() + pool.numFree(),
    usedConnections: pool.numUsed(),
    freeConnections: pool.numFree(),
    pendingAcquires: pool.numPendingAcquires(),
  };

  console.log('Pool metrics:', metrics);

  // Alert if pool is exhausted
  if (pool.numFree() === 0 && pool.numPendingAcquires() > 0) {
    console.error('WARNING: Connection pool exhausted!');
    // Send alert to monitoring system
  }
}, 60000); // Check every minute
```

### 7. SSL/TLS in Production

Always use SSL for production databases:

```typescript
capsule.addConnection({
  driver: 'postgres',
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  },
});
```

### 8. Query Timeout

Set query timeouts to prevent long-running queries:

```typescript
capsule.addConnection({
  // ... other config
  acquireConnectionTimeout: 10000,
  pool: {
    acquireTimeoutMillis: 30000,
  },
});

// Or per-query timeout
await DB.table('users')
  .timeout(5000) // 5 seconds
  .get();
```

## Security Best Practices

### 1. Never Trust User Input

Always use parameter binding:

```typescript
// Bad: SQL injection vulnerability
const userId = req.params.id;
await DB.raw(`SELECT * FROM users WHERE id = ${userId}`);

// Good: Parameter binding
await DB.raw('SELECT * FROM users WHERE id = ?', [userId]);
```

### 2. Use Least Privilege Principle

Database users should have minimum required permissions:

```sql
-- Create read-only user for reporting
CREATE USER reporting_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting_user;

-- Create app user with specific permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON specific_tables TO app_user;
```

### 3. Encrypt Sensitive Data

Encrypt sensitive columns:

```typescript
class User extends Model {
  protected casts = {
    ssn: EncryptedCast, // Custom cast for encryption
    credit_card: EncryptedCast,
  };
}
```

### 4. Audit Logging

Log all data modifications:

```typescript
User.creating((user) => {
  AuditLog.create({
    action: 'user_created',
    user_id: user.id,
    ip_address: req.ip,
    timestamp: new Date(),
  });
});

User.updated((user) => {
  AuditLog.create({
    action: 'user_updated',
    user_id: user.id,
    changes: user.getChanges(),
    ip_address: req.ip,
    timestamp: new Date(),
  });
});
```

## Conclusion

Following these advanced patterns and best practices will help you build robust, scalable, and secure applications with GuruORM. Remember to:

- Use transactions for data integrity
- Configure connection pooling appropriately
- Monitor and optimize query performance
- Implement proper error handling
- Follow security best practices
- Test thoroughly before deploying to production

For more information, see the other documentation sections:
- [Query Builder](./query-builder.md)
- [Eloquent ORM](./eloquent.md)
- [Migrations](./migrations.md)
- [Seeding](./seeding.md)
