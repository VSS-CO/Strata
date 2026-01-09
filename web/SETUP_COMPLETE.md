# Website Setup Complete

Two separate, production-ready Astro websites have been created for Strata:

## 1. Main Website (`web/astro/`)

**Purpose**: Marketing/landing page for Strata

**Tech Stack**:
- Astro 5.16.7
- Pure CSS with CSS variables (no frameworks)
- Responsive design

**Structure**:
```
src/
├── components/
│   ├── Header.astro      - Navigation header
│   ├── Hero.astro        - Landing hero section
│   ├── Features.astro    - Features showcase
│   └── Footer.astro      - Footer with links
├── layouts/
│   └── BaseLayout.astro  - Base page layout
└── pages/
    ├── index.astro       - Home page
    └── privacy.astro     - Privacy policy
```

**Features**:
- Clean, modern design inspired by astro.build
- Responsive layout with mobile-first approach
- CSS color variables for easy theming
- Fast static generation
- No JavaScript dependencies

**Getting Started**:
```bash
cd web/astro
npm install
npm run dev    # Development server
npm run build  # Production build
```

## 2. Documentation Site (`web/docs/`)

**Purpose**: Complete language documentation

**Tech Stack**:
- Astro 5.16.7
- Starlight theme (documentation framework)
- Markdown/MDX content

**Structure**:
```
src/content/docs/
├── index.mdx                    - Homepage
├── getting-started/
│   ├── introduction.md
│   ├── installation.md
│   └── quick-start.md
├── guide/
│   ├── variables-and-types.md
│   ├── functions.md
│   ├── control-flow.md
│   └── type-system.md
├── examples/
│   ├── hello-world.md
│   └── fibonacci.md
└── reference/
    └── builtins.md
```

**Features**:
- Beautiful Starlight theme
- Auto-generated sidebar navigation
- Built-in search
- Dark mode support
- GitHub edit links
- Responsive and mobile-friendly
- Syntax highlighting for code blocks

**Getting Started**:
```bash
cd web/docs
npm install
npm run dev    # Development server
npm run build  # Production build
```

## Configuration

### Main Website (`astro.config.mjs`)
```javascript
export default defineConfig({
  site: 'https://strata-lang.dev',
});
```

### Docs Website (`astro.config.mjs`)
```javascript
export default defineConfig({
  site: 'https://docs.strata-lang.dev',
  integrations: [
    starlight({
      title: 'Strata Documentation',
      // ... sidebar and other config
    }),
  ],
});
```

## Development

### Running Both Sites Simultaneously

Terminal 1:
```bash
cd web/astro
npm run dev
# Visit http://localhost:3000
```

Terminal 2:
```bash
cd web/docs
npm run dev
# Visit http://localhost:3001
```

## Building for Production

### Main Website
```bash
cd web/astro
npm run build
# Output in dist/
```

### Docs Website
```bash
cd web/docs
npm run build
# Output in dist/
```

## Customization

### Main Website

**Colors**: Edit CSS variables in `src/layouts/BaseLayout.astro`
```css
:root {
  --color-primary: #0284c7;
  --color-primary-dark: #0369a1;
  --color-primary-light: #0ea5e9;
}
```

**Content**: Update components in `src/components/`
- `Header.astro`: Navigation and hero button
- `Hero.astro`: Main headline and code example
- `Features.astro`: Feature cards
- `Footer.astro`: Footer links and info

### Docs Website

**Sidebar Navigation**: Edit `astro.config.mjs` sidebar configuration

**Content**: Add/edit `.md` files in `src/content/docs/`

**Theme**: Starlight uses CSS variables (customizable via CSS)

## Deployment

Both sites are static and can be deployed to:
- **GitHub Pages**
- **Vercel**
- **Netlify**
- **CloudFlare Pages**
- **AWS S3**
- **Any static hosting**

### Example Deployment Steps

```bash
# Build both sites
cd web/astro && npm run build
cd ../docs && npm run build

# Deploy to GitHub Pages
git add dist/
git commit -m "Deploy websites"
git push
```

## Next Steps

1. **Update Content**: Replace placeholder text with real content
2. **Add Branding**: Update logos and colors
3. **Set Up Domain**: Point your domains to the hosting
4. **Add Analytics**: Integrate with analytics service
5. **Set Up CI/CD**: Automate deployment

## File Structure Summary

```
web/
├── astro/                    # Main website
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Page layouts
│   │   └── pages/           # Page routes
│   ├── package.json
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   └── README.md
│
├── docs/                     # Documentation site
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── content/
│   │   │   └── docs/        # Markdown documentation
│   │   └── assets/          # Images
│   ├── package.json
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   └── README.md
│
└── SETUP_COMPLETE.md        # This file
```

## Resources

- [Astro Docs](https://docs.astro.build)
- [Starlight Docs](https://starlight.astro.build)
- [GitHub - Strata](https://github.com/VSS-CO/Strata)

## Support

For questions or issues:
1. Check the respective README.md files
2. Review Astro/Starlight documentation
3. Open an issue on GitHub
