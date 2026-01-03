# Quick Package Creation Guide

## Create a New Package

### 1. Initialize Project

```bash
mkdir my-package
cd my-package
strata init --package
```

### 2. Edit strata.toml

```toml
[project]
name = "my-package"
version = "1.0.0"
description = "My awesome package"
author = "Your Name"
license = "GPL-3.0"
strata = "1.0.0"

[exports]
mymodule = "./src/mymodule.str"

[dependencies]
# Add dependencies here if needed
```

### 3. Create Package Code

```bash
mkdir src
# Create src/mymodule.str
```

**src/mymodule.str:**
```strata
import io from str

func greet(name: string) => string {
  return "Hello, " + name
}

func add(a: int, b: int) => int {
  return a + b
}
```

### 4. Test the Package

Create a test project that imports your package:

**strata.toml (consumer):**
```toml
[dependencies]
my-package = { path = "../my-package" }
```

**main.str:**
```strata
import mymodule from my-package

func main() => void {
  io.print(mymodule.greet("World"))
  io.print(mymodule.add(5, 3))
}

main()
```

## Package Manager Workflow

```
┌─────────────────────────────┐
│  Write strata.toml          │ Declare dependencies
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  strata add <package>       │ Resolve versions
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Download/Extract Package   │ To .strata/packages/
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Hash Verification (SHA256) │ Against strata.lock
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Generate strata.lock       │ Lock exact versions
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  strata build               │ Compile with deps
└─────────────────────────────┘
```

## File Reference

### strata.toml Structure

```toml
[project]
name = "unique-package-name"        # Required: unique identifier
version = "1.0.0"                   # Required: semantic version
description = "What it does"        # Recommended
author = "Your Name"                # Recommended
license = "GPL-3.0"                 # Recommended
keywords = ["util", "string"]       # Optional
repository = "https://github.com/..." # Optional
strata = "1.0.0"                    # Required: compiler version

[exports]
# Module name = Path to .str file
public = "./src/public.str"
internal = "./src/internal.str"

[dependencies]
# Package name = Version or path
http = "1.2.0"                      # Registry (exact)
crypto = ">=2.0.0,<3.0.0"           # Registry (range)
utils = { path = "./vendor/utils" } # Local
async = "git+https://github/org/async#v1.0.0" # Git

[build]
target = "c"                        # or "js"
optimization = "O2"                 # O0, O1, O2, O3
```

### strata.lock Structure

```toml
[metadata]
strata = "1.0.0"                    # Compiler version
generated = "2024-01-15T10:30:00Z"  # When lock was created

[[packages]]
name = "package-name"
requested = "1.2.0"                 # What was requested
resolved = "1.2.0"                  # What was actually resolved
source = "registry"                 # registry, git, or path
hash = "sha256:abc123..."           # Content hash
```

## Common Tasks

### Add a Dependency

```bash
strata add http 1.2.0
```

Updates `strata.toml`:
```toml
[dependencies]
http = "1.2.0"
```

Generates `strata.lock` with exact version and hash.

### Update a Dependency

```bash
strata update http
```

Resolves to latest version matching constraints, updates lock file.

### Remove a Dependency

```bash
strata remove http
```

Removes from `strata.toml` and regenerates lock.

### Verify Package Integrity

```bash
strata verify
```

Checks all packages match hashes in `strata.lock`.

### Use Offline

```bash
strata build --offline
```

Uses only cached packages matching `strata.lock`.

## Publishing a Package

### 1. Register (Future)

```bash
strata login
strata publish
```

### 2. Others Can Use It

```toml
[dependencies]
my-package = "1.0.0"
```

## Semantic Versioning

```
MAJOR.MINOR.PATCH
  1   .  2   .  3

1.0.0  → Initial release
1.0.1  → Bug fix (patch)
1.1.0  → New features (minor)
2.0.0  → Breaking changes (major)
```

## Best Practices

- ✅ Always commit `strata.lock` to version control
- ✅ Use semantic versioning for releases
- ✅ Write clear function signatures with types
- ✅ Document public API in README
- ✅ Use version ranges for flexibility: `>=1.0.0,<2.0.0`
- ✅ Add `.strata/` to `.gitignore`
- ❌ Don't edit `strata.lock` manually
- ❌ Don't commit `.strata/` folder
- ❌ Don't use broad ranges like `*` in lock files
- ❌ Don't shadow `std::` namespace

## Debugging

### Check Package Resolution

```bash
strata lock --verbose
```

Shows which versions were resolved and from where.

### Verify Hashes

```bash
strata verify --verbose
```

Shows hash mismatches (tampering or corruption).

### Clear Cache

```bash
rm -rf .strata/cache
strata lock
```

Redownloads all packages.
