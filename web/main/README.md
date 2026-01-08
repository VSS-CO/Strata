# Strata Website

A comprehensive web presence for the Strata programming language, featuring a landing page, interactive playground, project initializer, and complete documentation.

## Structure

```
web/main/
├── landing.html          # Homepage with hero, features, CTA
├── index.html            # Interactive code playground
├── playground.js         # Playground logic and examples
├── initlzr/              # Project initializer (Spring-like tool)
│   ├── index.html
│   ├── app.js
│   └── README.md
├── docs/                 # Complete documentation site
│   ├── index.html            # Documentation home
│   ├── getting-started.html  # Installation & quick start
│   ├── types.html            # Type system
│   ├── variables.html        # Variables & binding
│   ├── functions.html        # Function declarations
│   ├── control-flow.html     # If/else, loops
│   ├── operators.html        # All operators
│   ├── modules.html          # Imports & modules
│   ├── stdlib-io.html        # IO module
│   ├── stdlib-math.html      # Math module
│   ├── stdlib-text.html      # Text module
│   ├── examples.html         # Code examples
│   ├── faq.html              # FAQ
│   └── playground.html       # Playground guide
└── README.md             # This file
```

## Pages Overview

### Landing Page (landing.html)
- Hero section with call-to-action
- Key features highlighting
- Code example showcase
- Statistics
- Get started section
- Professional navigation

### Playground (index.html + playground.js)
- Live code editor with syntax highlighting
- 10+ built-in examples
- Real-time execution
- Output panel
- Searchable example browser
- Dark editor theme
- Responsive layout

### Project Initializer (initlzr/)
- Spring Boot-like project generator
- Form for project configuration
- Feature selection (Math, Text, Util, Time, File)
- Build options
- Live preview of strata.toml
- ZIP download of complete project structure

### Documentation (docs/)
**Getting Started Section:**
- Introduction - What is Strata
- Installation - Setup instructions
- Try It Online - Playground guide

**Language Guide:**
- Types - All primitive types and type system
- Variables - let, const, var explained
- Functions - Function declarations and usage
- Control Flow - if/else, while, for, break, continue
- Operators - All operators and precedence
- Modules - Import system and standard library

**Standard Library:**
- IO Module - print() function
- Math Module - sqrt, pow, abs, floor, ceil, sin, cos
- Text Module - len, upper, lower

**More:**
- Examples - 15+ working code examples
- FAQ - Frequently asked questions
- Playground Guide - How to use the playground

## Navigation

All pages include:
- Sticky navigation bar with logo and links
- Sidebar with contextual menu
- Breadcrumb navigation (docs only)
- Previous/Next links between pages
- Link to playground and initializer

## Technology Stack

### Landing & Playground
- **HTML5** - Semantic structure
- **Tailwind CSS** - Via CDN for styling
- **jQuery** - Via CDN for DOM manipulation
- **Highlight.js** - Via CDN for syntax highlighting
- **JSZip** - Via CDN for ZIP file generation

### Documentation
- **HTML5** - Clean semantic markup
- **Inline CSS** - No external stylesheets needed
- **Responsive Design** - Works on mobile and desktop

## Design

### Color Scheme
- Primary Blue: #0066cc
- Dark Blue: #0052a3
- Light Blue: #e6f0ff
- Dark Text: #333
- Code Background: #1e1e1e

### Typography
- System fonts for fast loading
- Responsive font sizes
- Clear hierarchy with h1, h2, h3

### Layout
- Fixed sidebar navigation (docs only)
- Sticky top navigation bar
- Max-width content for readability
- Proper spacing and padding

## Navigation Links

- `landing.html` → Home page
- `index.html` → Playground
- `initlzr/index.html` → Project initializer
- `docs/index.html` → Documentation home
- All pages link to each other seamlessly

## Getting Started

1. Open `landing.html` in a browser to see the homepage
2. Click "Try Online" to use the playground
3. Click "Documentation" to read the docs
4. Click "Get Started" or "New Project" to use the initializer

## Future Enhancements

- [ ] Integrate actual Strata compiler
- [ ] Real code execution in playground
- [ ] User accounts and code saving
- [ ] Code sharing with shareable URLs
- [ ] Multi-file project support
- [ ] Download projects as ZIP
- [ ] Dark mode toggle
- [ ] Mobile-optimized examples
- [ ] Video tutorials
- [ ] Community showcase

## Deployment

All files are pure HTML/CSS/JavaScript with CDN dependencies. Can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static file hosting

No build step required!

## File Sizes

- landing.html: ~12 KB
- index.html: ~10 KB
- playground.js: ~20 KB
- Each docs page: ~8-12 KB
- Total: ~150 KB (highly gzip-compressible)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern ES6+ browsers

## License

Same as Strata: GNU GPL 3.0

## Related

- [Strata GitHub](https://github.com/VSS-CO/Strata)
- [Strata Documentation](./docs/index.html)
- [Project Initializer](./initlzr/index.html)
