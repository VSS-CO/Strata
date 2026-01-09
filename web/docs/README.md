# Strata Documentation

The official documentation site for Strata programming language, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Project Structure

```
src/
├── content/
│   └── docs/
│       ├── getting-started/      # Getting started guides
│       ├── guide/                # Language guide
│       ├── examples/             # Code examples
│       ├── reference/            # API reference
│       └── index.mdx             # Homepage
├── assets/                       # Images and other assets
└── content.config.ts             # Content collection config
```

## Features

- **Starlight Theme**: Beautiful, feature-rich documentation theme
- **Markdown & MDX**: Write content in Markdown with JSX components
- **Auto-generated Sidebar**: Automatically organize documentation
- **Search**: Built-in full-text search
- **Mobile Responsive**: Works great on all devices
- **Dark Mode**: Automatic dark mode support
- **Syntax Highlighting**: Code blocks with syntax highlighting
- **Edit Links**: Links to edit documentation on GitHub

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

The static site will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Creating Documentation

### Add a New Page

Create a new `.md` or `.mdx` file in `src/content/docs/`:

```bash
# Single page
src/content/docs/my-page.md

# Organized in folder
src/content/docs/my-section/my-page.md
```

### Front Matter

Every page needs front matter at the top:

```markdown
---
title: Page Title
description: A brief description for SEO
---

# Your Content

Your content here...
```

### Link Between Pages

```markdown
[Link text](./other-page)
[Link text](../other-section/page)
```

## Customizing Sidebar

Edit the sidebar configuration in `astro.config.mjs`:

```javascript
sidebar: [
  {
    label: 'Getting Started',
    items: [
      { label: 'Introduction', slug: 'getting-started/introduction' },
    ],
  },
]
```

### Auto-generate Sections

Use `autogenerate` to automatically list all pages in a directory:

```javascript
{
  label: 'API Reference',
  autogenerate: { directory: 'reference' },
}
```

## Configuration

### Site Information

Edit `astro.config.mjs`:

- `site`: Your domain (for sitemaps and social sharing)
- `title`: Documentation title
- `logo`: Logo image
- `social`: Social media links
- `editLink`: GitHub edit link

### Custom Styling

Starlight uses CSS variables for theming. Customize colors in your CSS.

## Content Collections

Documentation is organized as content collections. The schema is defined in `src/content.config.ts`.

## Search

Built-in search powered by Pagefind. Works automatically - no configuration needed!

## Deployment

### GitHub Pages

Uncomment the `gh-pages` configuration if deploying to GitHub Pages.

### Vercel

No special configuration needed. Vercel will automatically build and deploy.

### Netlify

No special configuration needed. Netlify will automatically build and deploy.

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [Starlight Documentation](https://starlight.astro.build)
- [Markdown Guide](https://www.markdownguide.org/)
- [Project README](../../README.md)

## Contributing

To contribute to the documentation:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for more details.
