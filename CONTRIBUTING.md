# Contributing to Space Optimization Demo

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Setting Up Development Environment

### Prerequisites
- Node.js 18+
- MongoDB 7+
- Docker & Docker Compose (optional)

### Quick Setup
```bash
# Clone the repository
git clone <your-fork-url>
cd space-optimization-demo

# Backend setup
cd api
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev

# Frontend setup (in new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Using Docker
```bash
# Copy environment files
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
# Then start all services
docker-compose up --build
```

## Code Style

### Frontend (Vue.js/TypeScript)
- Use TypeScript for all new files
- Follow Vue 3 Composition API patterns
- Use Pinia for state management
- Follow Carbon Design System guidelines for UI components

### Backend (Node.js)
- Use ES6+ features
- Follow RESTful API conventions
- Use async/await over promises
- Include JSDoc comments for functions
- Use meaningful variable and function names

### Database (MongoDB)
- Use Mongoose schemas with validation
- Include indexes for frequently queried fields
- Use meaningful collection and field names

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples
```
feat(api): add utilization report generation
fix(frontend): resolve cubicle reservation conflict
docs(readme): update installation instructions
refactor(api): simplify notification service
```

## Testing

### Backend Tests
```bash
cd api
npm test
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### Integration Tests
```bash
# Run full stack with test database
docker-compose -f docker-compose.test.yml up --build
```

## Reporting Bugs

We use GitHub issues to track bugs. Report a bug by [opening a new issue](../../issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We use GitHub issues to track feature requests. Request a feature by [opening a new issue](../../issues/new) with the "enhancement" label.

## Integration Guidelines

### Slack Integration
- Test webhook URLs in a dedicated test channel
- Use appropriate message formatting
- Include error handling for API failures

### Monday.com Integration
- Use meaningful board and item names
- Include proper error handling
- Test with a dedicated test board

### Firebase Integration
- Use environment-specific Firebase projects
- Implement proper error handling
- Test with appropriate user permissions

## Documentation

- Update README.md for user-facing changes
- Update INTEGRATIONS.md for integration changes
- Include JSDoc comments for functions
- Update API documentation for endpoint changes

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Feel free to open an issue with the "question" label if you have any questions about contributing!
