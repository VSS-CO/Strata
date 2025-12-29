# Contributing to Strata

Thank you for your interest in contributing to Strata! By contributing, you help improve the language, add features, and fix bugs for the entire community.

## How to Contribute

### 1. Fork the Repository

Create your own copy of the Strata repository by forking it.

### 2. Clone Your Fork

Clone your fork to your local machine:

```
git clone https://github.com/your-username/strata.git
cd strata
```

### 3. Create a Branch

Create a branch for your feature or bug fix:

```
git checkout -b feature/your-feature-name
```

### 4. Make Changes

* Implement new features, improve the interpreter, parser, or generators.
* Ensure your code follows the existing style.
* Add examples or tests if necessary.

### 5. Test Your Changes

* Run the CLI commands to test the interpreter and compiler.
* Ensure that your changes do not break existing functionality.

```
node main.js run example.str
node main.js compile example.str --target c
```

### 6. Commit Your Changes

Write clear, concise commit messages:

```
git add .
git commit -m "Add feature X / Fix bug Y"
```

### 7. Push and Create a Pull Request

Push your branch to your fork:

```
git push origin feature/your-feature-name
```

Then create a pull request to the main Strata repository with a detailed description of your changes.

## Guidelines

* Follow the existing code style and formatting.
* Write readable, maintainable code.
* Document new features or changes clearly.
* Test thoroughly before submitting a PR.
* Be respectful and collaborative in discussions.

## Areas to Contribute

* Core language features (lexer, parser, interpreter)
* Standard library modules (`str.io`, `str.math`, etc.)
* Code generators (C, C++, C#, Shell, Batch)
* Documentation and examples
* Bug fixes and optimizations

---

Strata is open-source and community-driven. Every contribution, no matter how small, is welcome!
