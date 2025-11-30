# Installation & Setup Instructions

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- MySQL database (for current phase)

## Installation Steps

### Step 1: Clone or Navigate to Project

```bash
cd /tmp/guruorm
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required dependencies:
- TypeScript and type definitions
- Database drivers (mysql2, pg, better-sqlite3, tedious)
- Development tools (ESLint, Prettier, Jest)
- CLI tools (Commander, Chalk)
- Helper libraries (dayjs, faker)

### Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 4: Run Tests

```bash
npm test
```

## Development Workflow

### Watch Mode

For active development with auto-recompilation:

```bash
npm run build:watch
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

## Using guruORM in Your Project

### Option 1: Link Locally (Development)

```bash
# In guruorm directory
npm link

# In your project directory
npm link guruorm
```

### Option 2: Install from File

```bash
npm install /tmp/guruorm
```

### Option 3: Publish to npm (Future)

```bash
npm publish
```

## Configuration

### Environment Variables

Create a `.env` file in your project:

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=root
DB_PASSWORD=your_password
```

### Basic Setup

```typescript
import { Capsule } from 'guruorm';
import dotenv from 'dotenv';

dotenv.config();

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_DATABASE!,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  charset: 'utf8mb4',
  pool: {
    min: 2,
    max: 10,
  },
});

capsule.setAsGlobal();
capsule.bootEloquent();

export default capsule;
```

## Database Setup

### MySQL

1. Create a database:
```sql
CREATE DATABASE your_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Create a user (optional):
```sql
CREATE USER 'your_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON your_database.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### Docker Setup (Optional)

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: guruorm_test
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

Run with:
```bash
docker-compose up -d
```

## Example Usage

Create a file `example.ts`:

```typescript
import './database'; // Your database configuration
import { Capsule } from 'guruorm';

async function main() {
  try {
    // Get all users
    const users = await Capsule.table('users').get();
    console.log('Users:', users);

    // Get specific user
    const user = await Capsule.table('users')
      .where('id', 1)
      .first();
    console.log('User:', user);

    // Insert a user
    await Capsule.table('users').insert({
      name: 'John Doe',
      email: 'john@example.com',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Update a user
    await Capsule.table('users')
      .where('id', 1)
      .update({ name: 'Jane Doe', updated_at: new Date() });

    // Count users
    const count = await Capsule.table('users').count();
    console.log('Total users:', count);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

Run with:
```bash
npx ts-node example.ts
# or after building:
node dist/example.js
```

## CLI Usage (Placeholders - Full implementation in Phase 8)

```bash
# Show help
npx guruorm --help

# Initialize guruORM
npx guruorm init

# Create migration
npx guruorm make:migration create_users_table

# Run migrations
npx guruorm migrate

# Create seeder
npx guruorm make:seeder UserSeeder

# Run seeders
npx guruorm db:seed
```

## Troubleshooting

### TypeScript Errors

If you get TypeScript errors, make sure you have @types/node installed:
```bash
npm install --save-dev @types/node
```

### MySQL Connection Issues

1. Check MySQL is running:
```bash
mysql -u root -p
```

2. Verify connection details in `.env`

3. Check firewall settings

4. Ensure MySQL user has proper permissions

### Module Not Found

If you get "Cannot find module" errors:
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## VSCode Setup (Recommended)

Install these extensions:
- ESLint
- Prettier - Code formatter
- TypeScript Importer
- Path Intellisense

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

1. ✅ Installation complete
2. ✅ Build successful
3. ✅ Tests passing
4. 📖 Read [QUICKSTART.md](./QUICKSTART.md)
5. 📖 Read [docs/getting-started.md](./docs/getting-started.md)
6. 🚀 Start building!

## Support

- 📚 [Documentation](./docs/)
- 💡 [Examples](./examples/)
- 🐛 [Report Issues](https://github.com/rishicool/guruorm/issues)
- 💬 [Discussions](https://github.com/yourusername/guruorm/discussions)

---

**You're all set!** Start using guruORM! 🎉
