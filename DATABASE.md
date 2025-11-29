# Database Drivers - GuruORM

Complete guide for all supported database drivers with working examples.

## Supported Databases

GuruORM supports 4 major database systems:

- ✅ **MySQL** (via mysql2)
- ✅ **PostgreSQL** (via pg)
- ✅ **SQLite** (via better-sqlite3)
- ✅ **SQL Server** (via tedious)

---

## 🐬 MySQL

### Installation

```bash
npm install guruorm mysql2
```

### Configuration

```javascript
const { Capsule } = require('guruorm');

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'myapp',
  username: 'root',
  password: 'password',
  charset: 'utf8mb4',
  pool: {
    min: 0,
    max: 10,
  },
});

capsule.setAsGlobal();
capsule.bootEloquent();
```

### Environment Variables

```env
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=root
DB_PASSWORD=password
```

### Features
- ✅ Connection pooling
- ✅ Prepared statements
- ✅ Transactions
- ✅ UTF-8 support
- ✅ Multiple connections

### Example
👉 **[See Complete MySQL Example](examples/mysql-example.js)**

---

## 🐘 PostgreSQL

### Installation

```bash
npm install guruorm pg
```

### Configuration

```javascript
const { Capsule } = require('guruorm');

const capsule = new Capsule();

capsule.addConnection({
  driver: 'pgsql',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'password',
  pool: {
    min: 0,
    max: 10,
  },
});

capsule.setAsGlobal();
capsule.bootEloquent();
```

### Environment Variables

```env
DB_DRIVER=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=myapp
DB_USERNAME=postgres
DB_PASSWORD=password
```

### Features
- ✅ Connection pooling
- ✅ Prepared statements
- ✅ Transactions
- ✅ JSONB support
- ✅ Array types
- ✅ UUID support

### Example
👉 **[See Complete PostgreSQL Example](examples/postgres-example.js)**

---

## 📦 SQLite

### Installation

```bash
npm install guruorm better-sqlite3
```

**Note:** better-sqlite3 requires C++ compilation. If you have issues:
- Make sure you have build tools installed
- Use Node.js v18 or v20 (v24 has compatibility issues)
- Or use SQLite in Docker

### Configuration

```javascript
const { Capsule } = require('guruorm');

const capsule = new Capsule();

capsule.addConnection({
  driver: 'sqlite',
  database: './database.db', // File path
  // OR
  // database: ':memory:', // In-memory database
});

capsule.setAsGlobal();
capsule.bootEloquent();
```

### Features
- ✅ File-based database
- ✅ In-memory database
- ✅ Zero configuration
- ✅ Serverless
- ✅ Transactions
- ✅ Fast performance

### Example
👉 **[See Complete SQLite Example](examples/sqlite-example.js)**

---

## 🔷 SQL Server

### Installation

```bash
npm install guruorm tedious
```

### Configuration

```javascript
const { Capsule } = require('guruorm');

const capsule = new Capsule();

capsule.addConnection({
  driver: 'sqlserver',
  host: 'localhost',
  port: 1433,
  database: 'myapp',
  username: 'sa',
  password: 'YourStrong!Passw0rd',
  pool: {
    min: 0,
    max: 10,
  },
});

capsule.setAsGlobal();
capsule.bootEloquent();
```

### Environment Variables

```env
DB_DRIVER=sqlserver
DB_HOST=localhost
DB_PORT=1433
DB_DATABASE=myapp
DB_USERNAME=sa
DB_PASSWORD=YourStrong!Passw0rd
```

### Features
- ✅ Connection pooling
- ✅ Prepared statements
- ✅ Transactions
- ✅ TLS/SSL support
- ✅ Windows Authentication (optional)

### Example
👉 **[See Complete SQL Server Example](examples/sqlserver-example.js)**

---

## 🔄 Multiple Database Connections

You can use multiple databases simultaneously:

```javascript
const { Capsule } = require('guruorm');

const capsule = new Capsule();

// MySQL connection
capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  database: 'mysql_db',
  username: 'root',
  password: 'password',
}, 'mysql');

// PostgreSQL connection
capsule.addConnection({
  driver: 'pgsql',
  host: 'localhost',
  database: 'postgres_db',
  username: 'postgres',
  password: 'password',
}, 'pgsql');

capsule.setAsGlobal();
capsule.bootEloquent();

// Use specific connection
const users = await capsule.connection('mysql').table('users').get();
const posts = await capsule.connection('pgsql').table('posts').get();
```

---

## 🧪 Testing Connections

### Quick Connection Test

```javascript
const { Capsule } = require('guruorm');

async function testConnection() {
  const capsule = new Capsule();
  
  capsule.addConnection({
    driver: 'mysql', // or 'pgsql', 'sqlite', 'sqlserver'
    host: 'localhost',
    database: 'test',
    username: 'root',
    password: 'password',
  });

  try {
    const result = await capsule.table('users').count();
    console.log('Connection successful! Users:', result);
  } catch (error) {
    console.error('Connection failed:', error.message);
  } finally {
    await capsule.disconnect();
  }
}

testConnection();
```

### Run Example Tests

```bash
# MySQL
node examples/mysql-example.js

# PostgreSQL
node examples/postgres-example.js

# SQLite
node examples/sqlite-example.js

# SQL Server
node examples/sqlserver-example.js
```

---

## 🛠️ Troubleshooting

### MySQL

**Error: Access denied for user**
- Check username/password
- Grant privileges: `GRANT ALL ON database.* TO 'user'@'localhost';`

**Error: connect ECONNREFUSED**
- MySQL service not running
- Check host/port configuration

### PostgreSQL

**Error: password authentication failed**
- Check `pg_hba.conf` for authentication method
- Ensure user has proper permissions

**Error: database does not exist**
- Create database: `CREATE DATABASE myapp;`

### SQLite

**Error: better-sqlite3 compilation failed**
- Install build tools (python, C++ compiler)
- Use Node.js v18 or v20
- Try: `npm install better-sqlite3 --build-from-source`

**Error: unable to open database file**
- Check file path permissions
- Ensure directory exists

### SQL Server

**Error: Login failed for user**
- Enable SQL Server authentication
- Check mixed mode authentication

**Error: self signed certificate**
- Use `trustServerCertificate: true` in options

---

## 📚 Additional Resources

- [Getting Started Guide](docs/getting-started.md)
- [Query Builder Documentation](docs/query-builder.md)
- [Eloquent ORM Documentation](docs/eloquent.md)
- [Migrations Guide](docs/migrations.md)

---

## 🆘 Need Help?

- [GitHub Issues](https://github.com/rishicool/guruorm/issues)
- [Documentation](docs/getting-started.md)
- [Examples Directory](examples/)

---

Made with ❤️ by the GuruORM team
