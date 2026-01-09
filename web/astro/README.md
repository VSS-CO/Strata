# Strata Main Website

The official marketing website for the Strata programming language, built with Astro.

## Features

- **Modern Design** — Beautiful, responsive layout inspired by professional developer tools
- **Fast Performance** — Static site generation with zero JavaScript bloat
- **Component-Based** — Reusable Astro components for easy maintenance
- **Type-Safe** — Full TypeScript support
- **SEO Optimized** — Proper meta tags and semantic HTML
- **Dark Mode Ready** — Can easily add dark mode support

## Structure

```
src/
├── components/          # Reusable Astro components
│   ├── Header.astro           # Navigation header
│   ├── HeroSection.astro      # Landing hero section
│   ├── Features.astro         # Features showcase (6 cards)
│   ├── CodeShowcase.astro     # Code example with features list
│   ├── Comparison.astro       # Language comparison table
│   └── Footer.astro           # Footer with links
├── layouts/             # Page templates
│   └── BaseLayout.astro       # Base page layout
├── pages/               # Page routes
│   ├── index.astro            # Home page
│   ├── privacy.astro          # Privacy policy
│   ├── license.astro          # License page
│   ├── terms.astro            # Terms of service
│   └── playground.astro       # Playground (coming soon)
└── styles/              # Global styles
    └── global.css             # CSS variables and utilities
```

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

## Design System

### Colors

- **Primary Blue**: `#0066cc` (--strata-blue)
- **Dark Blue**: `#0052a3` (--strata-dark)
- **Light Blue**: `#e6f0ff` (--strata-light)
- **Text Primary**: `#333`
- **Text Secondary**: `#666`

### Typography

- **Font**: System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, etc.)
- **Headings**: Bold, dark color
- **Body**: Regular weight, secondary color

### Components

All components use consistent:
- Spacing (padding, margins based on 4px grid)
- Rounded corners (6px for buttons, 8px for cards)
- Shadows (subtle drop shadows for depth)
- Hover states (color change or transform)

## Pages

### Home (`/`)
Main landing page with:
- Navigation header
- Hero section with CTA buttons
- 6 feature cards
- Code showcase with explanations
- Language comparison table
- Footer with links

### Privacy (`/privacy`)
Privacy policy page with standard sections

### License (`/license`)
License information and links to GitHub

### Terms (`/terms`)
Terms of service page

### Playground (`/playground`)
Coming soon page for interactive editor

## Components

### Header
Navigation bar with logo and links to:
- Documentation
- GitHub
- Playground

### HeroSection
Hero section with:
- Main headline
- Subheading
- CTA buttons (Get Started, View on GitHub)
- Stats grid (50+ Features, 100% Type Safe, Zero Overhead)

### Features
6-card feature grid showcasing:
1. High Performance ⚡
2. Type Safety ✓
3. Clean Syntax ✨
4. Multi-Target 📦
5. Developer Experience 🔧
6. Cross-Platform 🌍

### CodeShowcase
Code example (Fibonacci function) with feature highlights

### Comparison
Comparison table showing Strata vs Python, Go, Rust

### Footer
Footer with:
- Quick links to resources
- Community links
- Legal links
- Copyright notice

## Customization

### Change Colors

Edit `src/styles/global.css`:

```css
:root {
  --strata-blue: #0066cc;
  --strata-dark: #0052a3;
  --strata-light: #e6f0ff;
  /* ... */
}
```

### Modify Content

Edit individual component files in `src/components/`

### Update Navigation

Edit the links in `src/components/Header.astro`

### Add Pages

Create new `.astro` files in `src/pages/` and they'll automatically become routes:

```
src/pages/about.astro → /about
src/pages/blog/post.astro → /blog/post
```

## Performance

- **No CSS Framework** — Smaller bundle size
- **Static Generation** — Lightning-fast page loads
- **Minimal JavaScript** — Used only where necessary
- **Optimized Images** — Auto-optimized by Astro
- **Zero Hydration** — Pure static HTML by default

## Deployment

The `dist/` folder is ready to deploy to any static host:

- **Vercel**: Connect GitHub repo, automatically deploys
- **Netlify**: Upload `dist/` or connect GitHub
- **GitHub Pages**: Enable in repository settings
- **CloudFlare Pages**: Connect GitHub repo
- **AWS S3**: Upload `dist/` contents
- **Any static hosting**: Upload `dist/` contents

### Environment Variables

None required! This is a static site.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Android Chrome)
- No Internet Explorer support (it's 2024!)

## Lighthouse Scores

Target scores:
- Performance: 95+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

## File Size

- **HTML**: ~15KB (gzipped)
- **CSS**: ~5KB (gzipped)
- **JavaScript**: None (pure static)
- **Total**: ~20KB

Lightning fast! ⚡

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [Strata Documentation](https://docs.strata-lang.dev)
- [GitHub Repository](https://github.com/VSS-CO/Strata)

## License

Same as Strata. See [LICENSE](../../LICENSE) file.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

**Built with ❤️ for the Strata community**
