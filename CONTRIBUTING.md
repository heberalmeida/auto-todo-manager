# Contributing to Auto TODO Manager

Thank you for your interest in contributing to Auto TODO Manager! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Visual Studio Code
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/heberalmeida/auto-todo-manager.git
   cd auto-todo-manager
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Open in VSCode:
   ```bash
   code .
   ```

### Development Workflow

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test your changes:
   ```bash
   npm run compile
   ```
4. Press F5 in VSCode to launch a new Extension Development Host window
5. Test your changes in the new window
6. Commit your changes:
   ```bash
   git commit -m "Add: description of your changes"
   ```
7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Create a Pull Request

## Code Style

### TypeScript

- Use TypeScript strict mode
- Add JSDoc comments for all public functions and classes
- Use meaningful variable and function names
- Follow the existing code style

### Documentation

- Update README.md if adding new features
- Add JSDoc comments for new functions
- Update examples if behavior changes

## Testing

Currently, the project doesn't have automated tests, but we're working on it. For now:

1. Manually test your changes in the Extension Development Host
2. Test with different file types and TODO patterns
3. Test edge cases (empty files, large files, etc.)

## Reporting Bugs

When reporting bugs, please include:

- VSCode version
- Extension version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## Feature Requests

When suggesting features:

- Describe the use case
- Explain why it would be useful
- Provide examples if possible
- Consider implementation complexity

## Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Write clear commit messages
- Update documentation as needed
- Test your changes thoroughly
- Reference related issues

## Areas for Contribution

- Performance improvements
- Additional language support
- UI/UX enhancements
- Documentation improvements
- Test coverage
- Bug fixes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing!

