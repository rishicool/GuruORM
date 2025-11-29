# Contributing to guruORM

Thank you for considering contributing to guruORM! We welcome contributions from everyone.

## Code of Conduct

Please be respectful and constructive in all interactions with the community.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in [Issues](https://github.com/rishicool/guruorm/issues)
- Create a new issue with a clear title and description
- Include code samples, error messages, and steps to reproduce

### Suggesting Features

- Open an issue with the `feature request` label
- Clearly describe the feature and its use case
- Discuss the implementation approach

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Write tests for your changes
5. Ensure all tests pass: `npm test`
6. Lint your code: `npm run lint`
7. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
8. Push to your fork
9. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/rishicool/guruorm.git
cd guruorm

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Coding Standards

- Follow the existing code style
- Use TypeScript strict mode
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write unit tests for new features

### Testing

- Write unit tests for all new features
- Maintain or improve code coverage
- Test with all supported databases when applicable

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: refactor code`
- `chore: update dependencies`

## Questions?

Feel free to open an issue for any questions or discussions.

Thank you for contributing! 🎉
