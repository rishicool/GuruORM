# Publishing GuruORM to NPM

## Prerequisites

1. Create an NPM account: https://www.npmjs.com/signup
2. Login to NPM from terminal:
```bash
npm login
```

## Publishing Steps

### 1. Final Checks Before Publishing

```bash
# Build the project
npm run build

# Run tests (optional, since we don't have full tests yet)
# npm test

# Check what will be published
npm pack --dry-run

# Or create actual tarball to inspect
npm pack
tar -tzf guruorm-1.0.0.tgz
```

### 2. Update Version (Semantic Versioning)

```bash
# For patch release (1.0.0 -> 1.0.1)
npm version patch

# For minor release (1.0.0 -> 1.1.0)
npm version minor

# For major release (1.0.0 -> 2.0.0)
npm version major
```

### 3. Publish to NPM

```bash
# Publish to public registry
npm publish

# Or if you want to publish as scoped package
npm publish --access public
```

### 4. Verify Installation

```bash
# In a different directory, test installation
mkdir test-guruorm
cd test-guruorm
npm init -y
npm install guruorm

# Or with yarn
yarn add guruorm

# Or with pnpm
pnpm add guruorm
```

## Using GuruORM After Publishing

### Installation

```bash
npm install guruorm
# or
yarn add guruorm
# or
pnpm add guruorm
```

### Usage

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  database: 'mydb',
  username: 'root',
  password: 'password',
});

capsule.setAsGlobal();

// Use it
const users = await Capsule.table('users').get();
```

## Package Name

Currently: **`guruorm`**

If this name is taken on NPM, you can:
1. Choose a different name (e.g., `@yourname/guruorm`)
2. Use scoped package: `@username/guruorm`

To use scoped package:
```json
{
  "name": "@yourname/guruorm"
}
```

Then publish with:
```bash
npm publish --access public
```

## Updating Package

After making changes:

```bash
# 1. Make your changes
# 2. Commit to git
git add .
git commit -m "Your changes"

# 3. Update version
npm version patch  # or minor, or major

# 4. Push to git (with tags)
git push && git push --tags

# 5. Publish to NPM
npm publish
```

## NPM Package Stats

After publishing, view your package at:
- https://www.npmjs.com/package/guruorm
- https://npmjs.com/package/@yourname/guruorm (if scoped)

## Unpublishing (if needed)

```bash
# Unpublish specific version (within 72 hours)
npm unpublish guruorm@1.0.0

# Unpublish entire package (use with caution!)
npm unpublish guruorm --force
```

## Best Practices

1. ✅ Always update CHANGELOG.md before releasing
2. ✅ Test the package locally using `npm link`
3. ✅ Use semantic versioning properly
4. ✅ Keep README.md updated
5. ✅ Tag releases in Git
6. ✅ Never publish with uncommitted changes
