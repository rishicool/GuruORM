# GuruORM Publishing Guide

## Proper Version Publishing Workflow

**ALWAYS follow these steps in order:**

### 1. Make your changes
```bash
# Edit code, fix bugs, add features
git add .
git commit -m "feat: your feature description"
```

### 2. Update version (use npm version command)
```bash
# For patch releases (bug fixes): 2.0.18 → 2.0.19
npm version patch

# For minor releases (new features): 2.0.18 → 2.1.0
npm version minor

# For major releases (breaking changes): 2.0.18 → 3.0.0
npm version major
```

**What `npm version` does:**
- ✅ Updates version in `package.json`
- ✅ Creates a git commit automatically
- ✅ Creates a git tag (e.g., `v2.0.19`)

### 3. Build the package
```bash
npm run build
```

### 4. Test before publishing
```bash
# Run tests
npm test

# Check what will be published
npm pack --dry-run

# Install locally to test
npm link
```

### 5. Publish to NPM
```bash
npm publish
```

### 6. Push to GitHub (DON'T FORGET THIS!)
```bash
git push origin master
git push origin --tags
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ **Mistake 1: Publishing without committing version**
```bash
# BAD - Manual version change without commit
vim package.json  # Change version to 2.0.19
npm publish       # Publishes but no git history
```

### ✅ **Correct Way:**
```bash
npm version patch  # Updates package.json AND commits
npm publish
git push origin master --tags
```

---

### ❌ **Mistake 2: Publishing without pushing**
```bash
npm version patch
npm publish
# Forgot: git push origin master --tags
# Now NPM has 2.0.19 but GitHub doesn't!
```

### ✅ **Correct Way:**
```bash
npm version patch
npm publish
git push origin master --tags  # ALWAYS DO THIS
```

---

### ❌ **Mistake 3: Publishing broken code**
```bash
npm version patch
npm publish  # Didn't test or build!
```

### ✅ **Correct Way:**
```bash
npm version patch
npm run build
npm test
npm publish
git push origin master --tags
```

---

## 🔄 If You Need to Rollback/Unpublish

### Unpublish a version (within 72 hours)
```bash
npm unpublish guruorm@2.0.19
```

**⚠️ WARNING:** Only works within 72 hours and can break dependencies!

### Better: Publish a fixed version
```bash
# If 2.0.19 is broken, publish 2.0.20 with fixes
npm version patch  # → 2.0.20
npm run build
npm test
npm publish
git push origin master --tags
```

---

## 📝 Version History Issue - 2.0.19

**What happened:**
- Version 2.0.19 was published to NPM on Feb 7, 2026
- But the version bump was NOT committed to Git
- Local repo stayed at 2.0.18
- This breaks version tracking!

**Solution:**
- Skip 2.0.19 in Git history
- Jump directly to 2.0.20
- Add note in CHANGELOG explaining the skip

---

## 🚀 Quick Reference Checklist

Before every publish:

- [ ] All changes committed to Git
- [ ] Run `npm version patch/minor/major`
- [ ] Run `npm run build`
- [ ] Run `npm test`
- [ ] Run `npm publish`
- [ ] Run `git push origin master --tags`
- [ ] Verify on NPM: https://www.npmjs.com/package/guruorm
- [ ] Verify on GitHub: Tags match NPM versions

---

## 🛠️ Automated Publishing Script

Create `.github/workflows/publish.yml` for automated releases:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 📊 Check Current Status

```bash
# Local version
cat package.json | grep version

# NPM version
npm view guruorm version

# Git tags
git tag | grep v2.0 | sort -V | tail -5

# Should all match!
```
