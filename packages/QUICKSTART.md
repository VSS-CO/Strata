# Registry Quick Start

Get started with the Strata package registry in 5 minutes.

## View the Registry

### Local

```bash
python -m http.server 8000
# Visit http://localhost:8000/packages/
```

### Online

Visit: https://registry.strata-lang.org/ (when deployed)

## Browse Packages

**Homepage:**
- See all 4 packages
- Search by name, description, or keywords
- Sort by downloads, recently updated, or name

**Featured Packages:**
1. **http-client** (325 downloads)
   - HTTP request library
   - Latest: v1.1.0 (Jan 14, 2024)

2. **crypto** (222 downloads)
   - Cryptographic algorithms
   - Latest: v2.1.0 (Jan 15, 2024)

3. **string-utils** (150 downloads)
   - String manipulation
   - Latest: v1.0.0 (Jan 15, 2024)

4. **math-utils** (85 downloads)
   - Math functions and linear algebra
   - Latest: v1.2.0 (Jan 13, 2024)

## Install a Package

### Using Registry Website

1. Go to `index.html`
2. Click a package card
3. Click "Install" button
4. Copy the command that appears
5. Paste into terminal

### Using CLI

```bash
# Latest version
strata add http-client

# Specific version
strata add crypto 2.1.0

# Version range
strata add string-utils >=1.0.0,<2.0.0

# Git repository
strata add package "git+https://github.com/org/package#v1.0.0"

# Local path
strata add package { path = "./vendor/package" }
```

## Use Installed Packages

In your `.str` file:

```strata
import client from http-client
import aes from crypto
import string from string-utils

// Make HTTP request
let response: string = client.get("https://example.com")

// Encrypt data
let encrypted: string = aes.encryptAES256("secret", "key")

// String operations
let text: string = string.repeat("Hi", 3)
```

## View Package Details

**URL Format:**
```
package.html?pkg=package-name
```

**Examples:**
- `package.html?pkg=http-client`
- `package.html?pkg=crypto`
- `package.html?pkg=string-utils`
- `package.html?pkg=math-utils`

**Tabs:**
- **Overview** – Installation, quick start, features
- **Versions** – All versions with download stats
- **README** – Full documentation

## View Statistics

Visit `stats.html` to see:
- Total packages: 4
- Total versions: 6
- Total downloads: 782
- Download chart by package
- Version distribution chart
- Package rankings
- Registry health metrics

## Search & Filter

**Search Box:**
- Type to search by name, description, or keywords
- Results update in real-time

**Sort Options:**
- Downloads (most popular first)
- Recently Updated (newest versions first)
- Name A-Z (alphabetical order)

## Package Structure

Each package contains:

```
package-name/
├── 1.0.0/
│   ├── strata.toml              # Package manifest
│   │   [project]
│   │   name = "package-name"
│   │   version = "1.0.0"
│   │   [exports]
│   │   module = "./src/file.str"
│   │
│   └── src/
│       └── file.str             # Package code
```

## Publish Your Package

### 1. Create Package

Create `strata.toml`:

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

Create `src/mymodule.str`:

```strata
func greet(name: string) => string {
  return "Hello, " + name
}
```

### 2. Publish

```bash
strata publish
```

Registry will:
1. Verify package quality
2. Compute SHA256 hash
3. Add to registry.json
4. Make available for download

### 3. Users Install It

```bash
strata add my-package 1.0.0
```

## Version Management

### Semantic Versioning

```
1.2.3
↑ ↑ ↑
│ │ └─ Patch (bug fixes)
│ └─── Minor (new features)
└───── Major (breaking changes)
```

### Version Constraints

```toml
[dependencies]
# Exact
pkg = "1.2.3"

# Range
pkg = ">=1.0.0,<2.0.0"

# Any compatible
pkg = "*"

# Specific major version
pkg = "1.*"
```

## Registry Files

### Data

- `registry.json` – Package index
- `README.md` – Registry overview
- `REGISTRY_MANAGEMENT.md` – Maintainer guide
- `PACKAGE_GUIDE.md` – Quick reference

### Website

- `index.html` – Homepage with package listing
- `package.html` – Package detail page
- `stats.html` – Statistics dashboard
- `WEBSITE_GUIDE.md` – Website documentation

### Packages

```
string-utils/1.0.0/
http-client/1.0.0/
http-client/1.1.0/
crypto/2.0.0/
crypto/2.1.0/
math-utils/1.2.0/
```

## Common Tasks

### Search for Package

1. Go to `index.html`
2. Type in search box
3. Click on result

### Install Latest Version

```bash
strata add http-client
```

### Install Specific Version

```bash
strata add crypto 2.0.0
```

### View All Versions

1. Go to package detail page
2. Click "Versions" tab
3. See all versions with dates and downloads

### Check Registry Health

1. Go to `stats.html`
2. View KPI cards and charts
3. Check package rankings

### Update Package

1. Bump version in `strata.toml`
2. Run `strata publish`
3. New version appears in registry

### Yank (Deprecate) Version

```bash
strata registry yank package-name 1.0.0
```

Won't install by default, but can be explicitly installed if needed.

## Examples

### Using http-client

```strata
import client from http-client

func main() => void {
  let response: string = client.get("https://api.example.com")
  io.print(response)
}

main()
```

Install:
```bash
strata add http-client 1.1.0
```

### Using crypto

```strata
import aes from crypto
import sha from crypto

func main() => void {
  let encrypted: string = aes.encryptAES256("data", "key")
  let hash: string = sha.sha256("message")
}

main()
```

Install:
```bash
strata add crypto 2.1.0
```

### Using string-utils

```strata
import string from string-utils

func main() => void {
  let text: string = "hello"
  let upper: string = string.toUpperCase(text)
  let repeated: string = string.repeat("Ha", 3)
}

main()
```

Install:
```bash
strata add string-utils 1.0.0
```

## Links

- **Homepage:** `index.html`
- **Package Detail:** `package.html?pkg=name`
- **Statistics:** `stats.html`
- **Full Guide:** `README.md`
- **Management:** `REGISTRY_MANAGEMENT.md`
- **Publishing:** `PACKAGE_GUIDE.md`

## Keyboard Shortcuts

- **Search Focus:** `Ctrl+K` (future)
- **Copy Install:** Click "Copy Install" button

## Troubleshooting

### Package not found

1. Check spelling (case-sensitive)
2. Visit `index.html` to browse all packages
3. Verify package is not yanked

### Wrong version installed

1. Check `strata.lock` for exact version
2. Run `strata lock` to regenerate
3. Specify exact version: `strata add pkg 1.2.3`

### Hash mismatch

1. Registry corrupted?
2. Run `strata registry verify`
3. Clear cache: `rm -rf .strata/cache`
4. Reinstall: `strata lock`

## Support

- **Issues:** GitHub
- **Documentation:** README files in registry
- **Community:** Discord/GitHub discussions

---

That's it! Start browsing and installing packages from the Strata registry.
