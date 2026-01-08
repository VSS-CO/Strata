# Registry Management Guide

This guide covers managing and maintaining the Strata package registry.

## Registry Architecture

### Single-File Index

The registry uses a single `registry.json` file as the source of truth:

```
registry.json
└── Contains metadata for ALL packages and versions
    - Package names, versions, checksums
    - Download statistics
    - Timestamps
    - Links to package archives
```

**Advantages:**
- Simple to mirror/replicate
- Fast lookups (load entire index)
- Easy to cache locally
- No complex database needed

**Alternative Approaches (Not Used):**
- ❌ Multiple JSON files per package (harder to query)
- ❌ Database backend (requires server)
- ❌ REST API (adds complexity)

### Package Storage

```
packages/
├── <package-name>/
│   ├── <version>/
│   │   ├── strata.toml           (package manifest)
│   │   └── src/                  (package code)
│   │       └── *.str files
```

**Note:** In production, packages would be distributed as `.tar.gz` archives, but this registry stores source directly for transparency.

## CLI Commands (For Maintainers)

### Publish a Package

```bash
strata publish
```

From within a package directory:
1. Reads `strata.toml`
2. Computes SHA256 hash
3. Uploads to registry
4. Updates `registry.json`
5. Invalidates cache

### Update Registry Index

```bash
strata registry update-index
```

Regenerates `registry.json` from all packages in the registry directory.

### Verify Registry Integrity

```bash
strata registry verify
```

Checks:
- ✅ All packages have `strata.toml`
- ✅ All hashes are correct
- ✅ Version numbers are valid (semver)
- ✅ No duplicate packages
- ✅ `registry.json` is current

### Yank a Version

```bash
strata registry yank crypto 2.0.0
```

Marks version as deprecated but keeps it available:

```json
{
  "version": "2.0.0",
  "yanked": true,
  "yank_reason": "Security vulnerability in AES implementation"
}
```

Yanked versions:
- ❌ Won't be installed by default (`strata add crypto`)
- ✅ Can still be explicitly installed (`strata add crypto@2.0.0`)
- ✅ Used if pinned in existing lock files

### Un-yank a Version

```bash
strata registry unyank crypto 2.0.0
```

Re-enables a yanked version.

### Search Registry

```bash
strata search string
```

Searches package names and descriptions:
```
string-utils          String utility functions
```

## Maintenance Tasks

### Daily

- Monitor for new package submissions
- Verify published packages are not malicious
- Check for security reports

### Weekly

```bash
strata registry verify
```

Verify registry integrity.

### Monthly

```bash
strata registry update-index
```

Regenerate index (usually automatic on publish).

Check statistics:
```bash
strata registry stats
```

Output:
```
Registry Statistics
Total Packages: 4
Total Versions: 6
Total Downloads: 782
Last Updated: 2024-01-15T10:30:00Z

Top Packages (by downloads):
1. http-client         (325 downloads)
2. crypto              (222 downloads)
3. string-utils        (150 downloads)
4. math-utils           (85 downloads)
```

### Quarterly

- Review package quality standards
- Update documentation
- Plan new features

## Adding a New Package

### Manual (Registry Maintainer)

1. Create directory: `packages/new-package/1.0.0/`
2. Copy `strata.toml` and source files
3. Update `registry.json`:
   ```json
   {
     "new-package": {
       "name": "new-package",
       "description": "...",
       "author": "Author Name",
       "versions": {
         "1.0.0": {
           "version": "1.0.0",
           "published": "2024-01-15T...",
           "downloads": 0,
           "yanked": false,
           "checksum": "sha256:...",
           "tarball": "new-package/1.0.0/",
           "size_bytes": 2048,
           "strata_version": ">=1.0.0"
         }
       }
     }
   }
   ```
4. Verify: `strata registry verify`
5. Commit changes

### Automated (Future)

```bash
strata publish
# Automatically adds to registry, updates index, announces on social media
```

## Version Bump Workflow

### Publish New Version

1. In package repository:
   ```toml
   [project]
   version = "1.1.0"  # Bumped from 1.0.0
   ```

2. Publish:
   ```bash
   strata publish
   ```

3. Registry automatically:
   - ✅ Adds new version entry
   - ✅ Computes hash
   - ✅ Updates `registry.json`
   - ✅ Keeps old versions available

### Version Constraints

Packages should follow semantic versioning:

```
MAJOR: Breaking API changes
MINOR: New features, backward compatible
PATCH: Bug fixes, backward compatible

Examples:
1.0.0 → 1.0.1 (patch: bug fix)
1.0.0 → 1.1.0 (minor: new function)
1.0.0 → 2.0.0 (major: API change)
```

## Quality Checks

Every published package must pass:

### 1. Manifest Validation

```bash
strata publish --validate
```

Checks:
- ✅ Valid `strata.toml`
- ✅ Name is unique (case-insensitive)
- ✅ Version is valid semver
- ✅ Author name provided
- ✅ License specified
- ✅ Description not empty
- ✅ Exports point to real files

### 2. Type Checking

```bash
strata publish --check-types
```

Ensures:
- ✅ All exported functions have type annotations
- ✅ All parameters are typed
- ✅ All return types are explicit
- ✅ No ambiguous `any` types

### 3. Compilation

```bash
strata publish --compile
```

Ensures package compiles without errors.

### 4. Security Scan

```bash
strata publish --security-scan
```

Checks:
- ✅ No hardcoded credentials
- ✅ No network access in module init
- ✅ No file system access without warning
- ✅ No system command execution

## Statistics & Analytics

### Track Downloads

`registry.json` includes download counts (updated when packages are installed):

```json
{
  "name": "http-client",
  "downloads": 325,
  "versions": {
    "1.0.0": { "downloads": 230 },
    "1.1.0": { "downloads": 95 }
  }
}
```

### View Registry Stats

```bash
strata registry stats
```

Output:
```
Strata Package Registry

Packages: 4
Versions: 6
Total Downloads: 782

Downloads by Package:
  http-client:   325 (41.6%)
  crypto:        222 (28.4%)
  string-utils:  150 (19.2%)
  math-utils:     85 (10.9%)

Most Downloaded Version:
  http-client@1.0.0 (230 downloads)

Last 7 Days:
  New Packages: 0
  New Versions: 1 (crypto@2.1.0)
  New Downloads: 42
```

## Security Considerations

### No Malicious Code

- Manually review package source before accepting
- Check for suspicious patterns:
  - Network calls in module initialization
  - File system access
  - System command execution
- Consider running automated security scans

### Hash Verification

- SHA256 hashes stored in `registry.json`
- Package manager verifies on install
- Detects tampering and corruption

### Transitive Trust (Future)

v2.0+ will support transitive dependencies with:
- Package signing (GPG/cosign)
- Sandbox execution (isolated imports)
- Trusted maintainer list

### Private Registry

For corporate use:

```bash
# Mirror official registry
git clone https://github.com/strata-lang/registry private-registry

# Add private packages
mkdir private-registry/packages/my-internal-lib/1.0.0

# Configure clients
strata config registry https://private-registry.example.com
```

## Disaster Recovery

### Backup Registry

```bash
# Full backup
tar -czf strata-registry-backup-2024-01-15.tar.gz packages/ registry.json

# Store in secure location
# Consider: AWS S3, GitHub releases, etc.
```

### Restore Registry

```bash
# Extract backup
tar -xzf strata-registry-backup-2024-01-15.tar.gz

# Verify integrity
strata registry verify

# Publish restored packages
strata registry update-index
```

### Version Control

Registry is version-controlled in Git:

```bash
git log packages/http-client/1.1.0/
# Shows all changes to a package version

git checkout <commit> -- packages/
# Restore from specific commit
```

## Troubleshooting

### Package Not Found

```bash
# Check if package exists
strata search http-client

# List all packages
strata registry list

# Check registry.json
cat registry.json | grep http-client
```

### Hash Mismatch

```bash
# Verify registry
strata registry verify --verbose

# Output:
# crypto@2.0.0: HASH MISMATCH
#   Expected: sha256:abc123...
#   Got:      sha256:def456...

# Regenerate hash
strata registry rehash crypto 2.0.0
```

### Corrupted Package

```bash
# Remove corrupted package
rm -rf packages/crypto/2.0.0/

# Re-publish from upstream
strata registry pull crypto 2.0.0 https://github.com/strata-lang/crypto

# Verify
strata registry verify
```

## Future Enhancements

- **Package Signing**: GPG signatures for authenticity
- **Web UI**: Search, browse, view package details
- **API Server**: REST API for package operations
- **Automated Testing**: CI/CD for all published packages
- **Security Scanning**: Automated vulnerability detection
- **Metrics Dashboard**: Downloads, popularity, quality scores
- **Package Reviews**: Community ratings and reviews

## Registry Configuration

### config.toml (Future)

```toml
[registry]
name = "Strata Package Registry"
url = "https://registry.strata-lang.org"
maintainers = ["core-team@strata-lang.org"]

[security]
require_signing = true
scan_on_publish = true

[features]
allow_transitive_deps = false
max_package_size_mb = 50
require_tests = false

[mirrors]
primary = "https://registry.strata-lang.org"
backup = "https://backup-registry.strata-lang.org"
```

## Links

- **Registry Repository**: https://github.com/strata-lang/registry
- **Package Manager**: https://github.com/strata-lang/strata
- **Package Quality Guidelines**: https://strata-lang.org/quality
- **Security Policy**: https://strata-lang.org/security
