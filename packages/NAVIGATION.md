# Registry Navigation Guide

Visual map of the Strata package registry website.

## Website Structure

```
packages/
│
├── 📄 index.html
│   │ Registry Homepage
│   │
│   ├── Search Box (top)
│   │   └── Real-time search by name/description/keywords
│   │
│   ├── Statistics Overview (below search)
│   │   ├── Total Packages: 4
│   │   ├── Total Versions: 6
│   │   ├── Total Downloads: 782
│   │   └── Average Quality: 4.6★
│   │
│   ├── Packages Grid (main area)
│   │   ├── Package Card 1: string-utils
│   │   │   └── Click → package.html?pkg=string-utils
│   │   ├── Package Card 2: http-client
│   │   │   └── Click → package.html?pkg=http-client
│   │   ├── Package Card 3: crypto
│   │   │   └── Click → package.html?pkg=crypto
│   │   └── Package Card 4: math-utils
│   │       └── Click → package.html?pkg=math-utils
│   │
│   └── Footer Links
│       ├── Quick Links (CLI Guide, Create Package, Publish)
│       ├── Registry (Browse, Guidelines, Stats)
│       ├── Community (GitHub, Discord, Issues)
│       └── Legal (Terms, Privacy, Code of Conduct)
│
├── 📄 package.html
│   │ Package Details Page (URL: ?pkg=package-name)
│   │
│   ├── Header
│   │   ├── Back to Registry link
│   │   ├── Package name & author
│   │   ├── Latest version badge
│   │   └── Copy Install button
│   │
│   ├── Metadata Bar
│   │   ├── License (GPL-3.0)
│   │   ├── Total Downloads
│   │   ├── Version Count
│   │   └── Last Updated
│   │
│   ├── Tabs
│   │   ├── Overview
│   │   │   ├── Installation command (copyable)
│   │   │   ├── Quick start example
│   │   │   ├── Features list
│   │   │   ├── Keywords
│   │   │   └── Sidebar (Links, Stats)
│   │   │
│   │   ├── Versions
│   │   │   └── Table of all versions
│   │   │       ├── Version number
│   │   │       ├── Published date
│   │   │       ├── Download count
│   │   │       └── Install button
│   │   │
│   │   └── README
│   │       └── Documentation link
│   │
│   └── Footer
│       └── Links to other sections
│
├── 📄 stats.html
│   │ Statistics Dashboard
│   │
│   ├── KPI Cards (top)
│   │   ├── Total Packages: 4
│   │   ├── Total Versions: 6
│   │   ├── Total Downloads: 782
│   │   └── Avg Quality: 90%
│   │
│   ├── Charts
│   │   ├── Downloads by Package (bar chart)
│   │   │   ├── http-client: 325
│   │   │   ├── crypto: 222
│   │   │   ├── string-utils: 150
│   │   │   └── math-utils: 85
│   │   │
│   │   └── Version Distribution (doughnut chart)
│   │       ├── http-client v1.0.0: 230
│   │       ├── http-client v1.1.0: 95
│   │       ├── crypto v2.0.0: 180
│   │       ├── crypto v2.1.0: 42
│   │       ├── string-utils: 150
│   │       └── math-utils: 85
│   │
│   ├── Package Rankings Table
│   │   ├── Rank | Package | Downloads | Versions | Latest | Quality
│   │   ├── 1    | http-client | 325 | 2 | 1.1.0 | 92%
│   │   ├── 2    | crypto | 222 | 2 | 2.1.0 | 95%
│   │   ├── 3    | string-utils | 150 | 1 | 1.0.0 | 88%
│   │   └── 4    | math-utils | 85 | 1 | 1.2.0 | 85%
│   │
│   └── Health Metrics
│       ├── Code Quality: 92%
│       ├── Documentation: 88%
│       └── Maintenance: 85%
│
└── 📚 Documentation Files
    ├── README.md                    (Registry overview)
    ├── QUICKSTART.md                (5-minute guide)
    ├── REGISTRY_MANAGEMENT.md       (Maintainer guide)
    ├── PACKAGE_GUIDE.md             (Creator guide)
    └── WEBSITE_GUIDE.md             (Website docs)
```

## Navigation Flows

### Flow 1: Browse & Install Package

```
1. Visit index.html
   ↓ (See all packages)
2. Search or sort
   ↓ (Find package)
3. Click package card
   ↓ (Go to package detail)
4. package.html?pkg=name
   ↓ (View details)
5. Click "Copy Install"
   ↓ (Copy command to clipboard)
6. Paste in terminal
   ↓ (Install package)
strata add package-name
```

### Flow 2: View Analytics

```
1. Visit index.html
   ↓ (Homepage)
2. Click "View Statistics"
   ↓ (Go to stats page)
3. stats.html
   ↓ (See analytics)
4. View charts, rankings, health metrics
   ↓ (Understand registry status)
5. Click package in rankings
   ↓ (Go to detail page)
6. package.html?pkg=name
```

### Flow 3: View Package Versions

```
1. Visit package.html?pkg=name
   ↓ (Package detail)
2. Click "Versions" tab
   ↓ (See all versions)
3. View table:
   - Version number
   - Published date
   - Download count
   ↓ (Choose version)
4. Click "Install" button
   ↓ (Copy command)
5. strata add package@version
```

## Key Pages at a Glance

| Page | URL | Purpose | Key Features |
|------|-----|---------|--------------|
| Homepage | `index.html` | Browse packages | Search, sort, statistics, install button |
| Package Details | `package.html?pkg=X` | View package info | Tabs (overview, versions, readme), links |
| Statistics | `stats.html` | View analytics | Charts, KPIs, rankings, health metrics |

## Header Navigation (All Pages)

```
Strata Logo / Title
│
├── Home → ../index.html
├── Docs → ../docs.html
├── Registry → index.html (current page)
└── Playground → ../playground.html
```

## Quick Links from Homepage

- **Search Box** – Real-time package search
- **Sort Dropdown** – Downloads, Recently Updated, Name (A-Z)
- **View Statistics** – Go to stats.html
- **Package Cards** – Click to view details
- **Install Buttons** – Copy installation command
- **GitHub Links** – Visit package repository
- **Footer Links** – Community, docs, legal

## Package Card Contents

```
┌─────────────────────────────────────┐
│ Package Name                  v1.0.0│
│ by Author Name                       │
│                                      │
│ Package description goes here...    │
│                                      │
│ [keyword1] [keyword2] [keyword3]    │
│                                      │
│ 325 Downloads | 2 Versions | 5d ago │
│                                      │
│ [Install Button]  [GitHub Button]   │
└─────────────────────────────────────┘
```

## Package Detail Tabs

### Overview Tab (Default)

```
Installation:
  strata add package-name

Quick Start:
  import module from package-name
  module.function()

Features:
  ✓ Feature 1
  ✓ Feature 2
  ✓ Feature 3

Keywords: [tag1] [tag2] [tag3]

Sidebar:
  ┌─────────────────┐
  │ Links           │
  │ → Homepage      │
  │ → GitHub        │
  │ → Report Issue  │
  │                 │
  │ Stats           │
  │ • Size: 2 KB    │
  │ • Quality: 90%  │
  └─────────────────┘
```

### Versions Tab

```
Version Table:
┌──────┬───────────┬─────────┬────────┐
│ Ver  │ Published │ DL      │ Action │
├──────┼───────────┼─────────┼────────┤
│ 1.0.0│ Jan 15    │ 150     │Install │
│ 1.0.1│ Jan 14    │ 50      │Install │
└──────┴───────────┴─────────┴────────┘
```

### README Tab

```
Documentation
→ Full docs at GitHub repository
```

## Statistics Page Sections

1. **KPI Cards** (top row)
   - Total packages
   - Total versions
   - Total downloads
   - Average quality

2. **Charts** (middle)
   - Bar chart: downloads by package
   - Doughnut chart: version distribution

3. **Rankings Table** (below charts)
   - Ranked by downloads
   - Shows: name, downloads, versions, quality

4. **Health Metrics** (bottom right)
   - Code quality progress bar
   - Documentation progress bar
   - Maintenance progress bar

## Keyboard & Mouse Interactions

| Action | Result |
|--------|--------|
| Click package card | Go to package.html |
| Type in search box | Real-time filter packages |
| Change sort dropdown | Re-sort visible packages |
| Click "Copy Install" | Command copied to clipboard |
| Click GitHub link | Open in new tab |
| Click "View Statistics" | Go to stats.html |
| Click package name in rankings | Go to package.html |

## Mobile Experience

- Responsive design (4-column → 2-column → 1-column)
- Search box full width
- Package cards stack vertically
- Statistics cards adapt to screen size
- Charts responsive
- All buttons touch-friendly

## Accessibility

- Semantic HTML (nav, main, footer)
- Color contrast meets WCAG standards
- Keyboard navigation supported
- Alt text on charts (data table provided)
- Form labels and buttons clearly labeled

## Performance

| Page | Load Time | Interaction |
|------|-----------|------------|
| index.html | <100ms | <50ms (search) |
| package.html | Instant | <20ms (tabs) |
| stats.html | <500ms | Charts render live |

---

**Summary:** The registry is a 3-page website with clear navigation and intuitive package discovery. Users can search, browse, view details, and install packages in minutes.
