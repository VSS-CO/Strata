# Strata Package Registry Website Guide

The registry now has a complete web interface for browsing and managing packages.

## Files

### Main Pages

- **index.html** – Registry homepage with package listing, search, and statistics
- **package.html** – Individual package detail page
- **stats.html** – Registry analytics dashboard with charts

### Backend

- **registry.json** – Single-file package index
- ***/version/** directories – Package source code

## Features

### 1. Registry Homepage (index.html)

**Features:**
- Search packages by name, description, or keywords
- Sort by downloads, recently updated, or name (A-Z)
- Quick installation commands (copy to clipboard)
- Statistics dashboard:
  - Total packages
  - Total versions
  - Total downloads
  - Average quality score

**Quick Links:**
- View Statistics dashboard
- Sort packages
- Search/filter

### 2. Package Detail Page (package.html)

**URL Format:**
```
package.html?pkg=package-name
```

**Examples:**
- `package.html?pkg=http-client`
- `package.html?pkg=crypto`

**Tabs:**
- **Overview** – Installation, quick start, features, keywords
- **Versions** – All versions with download counts and publish dates
- **README** – Package documentation

**Features:**
- Copy install command to clipboard
- View all versions
- Latest version badge
- Download statistics
- Links to GitHub/repository

### 3. Statistics Dashboard (stats.html)

**Features:**
- Key performance indicators (KPIs):
  - Total packages
  - Total versions
  - Total downloads
  - Average quality score
  
- Charts (using Chart.js):
  - Downloads by package (bar chart)
  - Version distribution (doughnut chart)
  
- Package rankings table:
  - Download count
  - Version count
  - Latest version
  - Quality score
  
- Registry health metrics:
  - Code quality
  - Documentation
  - Maintenance

## Usage

### Navigation

**From Home (index.html):**
1. Search for a package using the search box
2. Click a package card to view details
3. Click "View Statistics" to see registry analytics

**From Package Detail (package.html):**
1. Click tabs to view versions and documentation
2. Click "Back to Registry" to return to listing
3. Click "Copy Install" to get the installation command

**From Statistics (stats.html):**
1. View charts and metrics
2. Click a package in the rankings to go to detail page
3. Click back to return to registry homepage

### Search & Filter

**Search Box (homepage):**
- Searches package names
- Searches descriptions
- Searches keywords
- Real-time filtering

**Sort Options:**
- **Downloads** – Most popular first
- **Recently Updated** – Newest versions first
- **Name (A-Z)** – Alphabetical order

### Installation

**Copy Install Command:**
1. Go to package page (click package card)
2. Click "Copy Install" button
3. Paste into terminal: `strata add package-name`

Or manually:
```bash
strata add http-client
strata add crypto 2.1.0
strata add string-utils >=1.0.0
```

## Customization

### Adding Packages

To add a new package:

1. Create directory: `packages/new-package/1.0.0/`
2. Add `strata.toml` and source files
3. Update `registry.json`:

```json
{
  "new-package": {
    "name": "new-package",
    "description": "What it does",
    "author": "Your Name",
    "license": "GPL-3.0",
    "homepage": "https://github.com/...",
    "keywords": ["tag1", "tag2"],
    "downloads": 0,
    "versions": {
      "1.0.0": {
        "version": "1.0.0",
        "published": "2024-01-15T10:00:00Z",
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

### Styling

The website uses **Tailwind CSS** (CDN). To customize:

1. Modify color schemes in `<style>` tags
2. Update badge colors in JavaScript
3. Adjust card layouts with Tailwind classes

### Data Source

All package data comes from `registry.json`. To update:

1. Edit `registry.json` manually, or
2. Run `strata registry update-index` (generates from packages)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance

- **Homepage:** <100ms load (static JSON)
- **Search:** Real-time filtering (<50ms)
- **Package page:** Instant (no server calls)
- **Statistics:** Charts render in <500ms

## Deployment

### Local Hosting

```bash
python -m http.server 8000
# Visit http://localhost:8000/packages/
```

### Static Hosting (AWS S3, GitHub Pages, etc.)

```bash
# Just upload the packages/ directory
# All files are static HTML/JSON/JS
# No server-side code needed
```

### With Custom Domain

```bash
strata config registry https://registry.example.com
```

Then package manager will use that URL instead.

## Future Enhancements

- [ ] User accounts & authentication
- [ ] Package publishing UI (instead of CLI)
- [ ] Package ratings & reviews
- [ ] Trending packages
- [ ] Security vulnerability alerts
- [ ] API endpoint for package data
- [ ] Package dependency visualization
- [ ] Download history graph
- [ ] Package quality grade (A-F)

## Structure

```
packages/
├── index.html              # Registry homepage
├── package.html            # Package detail page
├── stats.html              # Statistics dashboard
├── registry.json           # Package index
│
├── string-utils/1.0.0/     # Package storage
│   ├── strata.toml
│   └── src/
│
├── http-client/1.0.0/
│   ├── strata.toml
│   └── src/
│
├── http-client/1.1.0/      # Multiple versions
│   ├── strata.toml
│   └── src/
│
└── crypto/2.0.0/
    ├── strata.toml
    └── src/
```

## FAQ

**Q: Where's the server code?**
A: There isn't any. The website is entirely static. Package data comes from `registry.json`. Perfect for CDN distribution.

**Q: How do I add packages?**
A: Create directories in `packages/` and update `registry.json`.

**Q: Can I host this on GitHub Pages?**
A: Yes! Just push the `packages/` directory.

**Q: How does the package manager find packages?**
A: It reads `registry.json` and downloads from the specified `tarball` path.

**Q: Can I add custom CSS?**
A: Yes. Add `<style>` blocks or modify Tailwind classes in HTML.

**Q: Is there authentication?**
A: Not in v1.0. The registry is public. v2.0+ will add user accounts.

## Links

- **Homepage:** `index.html`
- **Package Details:** `package.html?pkg=name`
- **Statistics:** `stats.html`
- **Root Site:** `../index.html`
- **Documentation:** `../docs.html`
