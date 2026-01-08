# Strata Package Registry

This directory contains the official Strata package registry—a central repository of published packages that developers can download and use in their projects.

## Registry Structure

```
packages/
├── registry.json                    # Registry metadata & package index
├── string-utils/
│   └── 1.0.0/
│       ├── strata.toml
│       └── src/
│           └── string.str
├── http-client/
│   ├── 1.0.0/
│   │   ├── strata.toml
│   │   └── src/
│   └── 1.1.0/
│       ├── strata.toml
│       └── src/
├── crypto/
│   ├── 2.0.0/
│   │   ├── strata.toml
│   │   └── src/
│   └── 2.1.0/
│       ├── strata.toml
│       └── src/
└── math-utils/
    └── 1.2.0/
        ├── strata.toml
        └── src/
```

## registry.json Format

The registry is indexed by a single JSON file that lists all packages and versions:

```json
{
  "registry": {
    "name": "Strata Package Registry",
    "version": "1.0.0",
    "url": "https://registry.strata-lang.org",
    "updated": "2024-01-15T10:30:00Z"
  },
  "packages": {
    "package-name": {
      "name": "package-name",
      "description": "What it does",
      "author": "Author Name",
      "license": "GPL-3.0",
      "homepage": "https://...",
      "repository": "https://...",
      "keywords": ["tag1", "tag2"],
      "versions": {
        "1.0.0": {
          "version": "1.0.0",
          "published": "2024-01-15T10:00:00Z",
          "downloads": 150,
          "yanked": false,
          "checksum": "sha256:abc123...",
          "tarball": "package-name/1.0.0/package-name-1.0.0.tar.gz",
          "size_bytes": 2048,
          "strata_version": ">=1.0.0"
        }
      },
      "downloads": 150,
      "created": "2024-01-15T10:00:00Z",
      "updated": "2024-01-15T10:00:00Z"
    }
  },
  "statistics": {
    "total_packages": 4,
    "total_versions": 6,
    "total_downloads": 782,
    "last_updated": "2024-01-15T10:30:00Z"
  }
}
```

**Key Fields:**

- `name` – Package identifier (unique)
- `version` – Semantic versioning (MAJOR.MINOR.PATCH)
- `checksum` – SHA256 hash for verification
- `tarball` – Path to package archive
- `downloads` – Download count (popularity metric)
- `yanked` – If true, version is deprecated but still available
- `strata_version` – Compatible Strata compiler versions

## Available Packages

### string-utils (1.0.0)

String manipulation utilities.

```strata
import string from string-utils

string.length("hello")
string.toUpperCase("hello")
string.repeat("ha", 3)
string.contains("hello", "ll")
string.trim("  spaces  ")
```

**Usage:**
```toml
[dependencies]
string-utils = "1.0.0"
```

### http-client (1.0.0 / 1.1.0)

HTTP client for making web requests.

```strata
import client from http-client
import response from http-client  // v1.1.0+

client.get("https://example.com")
client.post("https://example.com", "{\"key\": \"value\"}")
```

**v1.1.0 Improvements:**
- Added PATCH and HEAD methods
- New response handling module
- Better error handling

**Usage:**
```toml
[dependencies]
http-client = "1.1.0"  # Latest
# or
http-client = ">=1.0.0,<2.0.0"  # 1.x range
```

### crypto (2.0.0 / 2.1.0)

Cryptographic algorithms: AES, SHA256, HMAC.

```strata
import aes from crypto
import sha from crypto
import hmac from crypto  // v2.1.0+

aes.encryptAES256("plaintext", "key")
sha.sha256("message")
hmac.hmacSHA256("message", "key")  // v2.1.0+
```

**v2.1.0 Improvements:**
- Added HMAC support
- New signature verification
- Better performance

**Usage:**
```toml
[dependencies]
crypto = "2.1.0"  # Latest with HMAC
```

### math-utils (1.2.0)

Advanced math: linear algebra, statistics, matrices.

```strata
import algebra from math-utils
import stats from math-utils
import matrix from math-utils

algebra.magnitude(vector)
stats.mean(data)
matrix.multiply(a, b)
```

**Usage:**
```toml
[dependencies]
math-utils = "1.2.0"
```

## Installing Packages

### From Registry

```bash
strata add string-utils 1.0.0
```

Updates `strata.toml`:
```toml
[dependencies]
string-utils = "1.0.0"
```

Generates `strata.lock` with exact version and hash.

### With Version Range

```bash
strata add http-client ">=1.0.0,<2.0.0"
```

### From Git

```bash
strata add crypto "git+https://github.com/strata-lang/crypto#v2.1.0"
```

### Verification

When installing, the package manager:
1. Downloads from registry
2. Verifies SHA256 hash matches registry.json
3. Extracts to `.strata/packages/`
4. Records exact version and hash in `strata.lock`

## Publishing to Registry

### 1. Create strata.toml

```toml
[project]
name = "my-package"
version = "1.0.0"
description = "What it does"
author = "Your Name"
license = "GPL-3.0"
strata = ">=1.0.0"

[exports]
mymodule = "./src/mymodule.str"
```

### 2. Publish

```bash
strata login
strata publish
```

### 3. Verify

Check registry.json to see your package listed.

## Registry Statistics

**Current Registry Status:**

- **Total Packages:** 4
- **Total Versions:** 6
- **Total Downloads:** 782
- **Last Updated:** 2024-01-15T10:30:00Z

**Top Downloads:**
1. http-client (325 downloads)
2. crypto (222 downloads)
3. string-utils (150 downloads)
4. math-utils (85 downloads)

## Version Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH

1.2.3
↑ ↑ ↑
│ │ └─ Patch: Bug fixes (backward compatible)
│ └─── Minor: New features (backward compatible)
└───── Major: Breaking changes
```

### Version Constraints

```toml
[dependencies]
# Exact version
pkg = "1.2.3"

# Patch only (1.2.x)
pkg = "1.2.*"

# Minor & patch (1.x.x)
pkg = "1.*"

# Range
pkg = ">=1.0.0,<2.0.0"

# Combine
pkg = ">=1.2.3,<2.0.0"

# Git
pkg = "git+https://github.com/org/pkg#v1.2.3"

# Local
pkg = { path = "./vendor/pkg" }
```

### Yanking Versions

Maintainers can yank (deprecate) versions:

```bash
strata yank my-package 1.0.0
```

Yanked versions appear in registry but can't be installed:

```json
{
  "version": "1.0.0",
  "yanked": true,
  "yank_reason": "Security vulnerability"
}
```

## Security

### Hash Verification

All packages are verified against SHA256 hashes:

```bash
strata verify
# Checks: sha256(package_content) == registry.json checksum
```

### No Code Execution

Package manager **never runs code** during installation. Packages are pre-built and fully portable.

### Transitive Deps (v1.0)

Currently disabled for security. Packages are self-contained.

Future (v2.0+): Sandboxed transitive dependencies.

## Offline Usage

### Cache Packages

First-time install downloads to cache:

```bash
strata add http-client 1.1.0
# → Downloaded to .strata/cache/http-client-1.1.0.tar.gz
```

### Build Offline

Subsequent builds use cache:

```bash
strata build --offline
# Works without network (uses .strata/cache/)
```

### Verify Cache

```bash
strata verify
# Checks cache against strata.lock hashes
```

## Registry Mirroring

For private/corporate use, mirror the registry:

```bash
# Clone registry
git clone https://github.com/strata-lang/registry

# Configure strata to use mirror
strata config registry https://private-registry.example.com
```

## Future Roadmap

**v1.0** (Current)
- ✅ Single registry index (registry.json)
- ✅ Hash verification (SHA256)
- ✅ Semantic versioning
- ✅ Local & git sources
- ✅ Offline support

**v2.0+**
- 🔄 Transitive dependencies (with sandboxing)
- 🔄 Package signing (GPG/cosign)
- 🔄 Search & discovery (web UI)
- 🔄 Package metrics (downloads, stars)
- 🔄 Automated security scanning

## Contributing

### Publishing a Package

1. Fork/clone registry repository
2. Create `packages/my-package/1.0.0/` directory
3. Add `strata.toml` and source files
4. Submit PR
5. Registry maintainers verify and merge

### Package Quality Standards

- ✅ Clear `strata.toml` with metadata
- ✅ Explicit type annotations
- ✅ No dependencies on pre-release versions
- ✅ Semantic versioning compliance
- ✅ README documentation
- ✅ Working example code
- ✅ Compatible with target Strata version

## Links

- **Registry Repository:** https://github.com/strata-lang/registry
- **Package Manager CLI:** `strata` command
- **Documentation:** https://strata-lang.org/docs
- **Community:** https://github.com/strata-lang/strata

## License

All packages in the registry are under their respective licenses (declared in strata.toml).

The registry itself is under GPL-3.0.
