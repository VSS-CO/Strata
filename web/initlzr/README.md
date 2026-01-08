# Strata Initializer

A web-based project generator for Strata, similar to Spring Boot's initializer. Creates boilerplate Strata projects with customizable features and dependencies.

## Features

- **Project Configuration**: Name, version, description, author, license
- **Project Types**: Choose between Application or Package libraries
- **Feature Selection**: Include optional modules (Math, Text, Util, Time, File I/O)
- **Build Options**: Configure compilation target (C/JavaScript) and optimization levels
- **Live Preview**: Real-time preview of generated `strata.toml`
- **One-Click Generation**: Download complete project structure

## Project Structure

```
initlzr/
├── index.html       # Main UI (pure HTML with Tailwind CSS)
├── app.js           # Application logic (jQuery)
└── README.md        # This file
```

## Technology Stack

- **HTML5**: Semantic markup
- **Tailwind CSS**: Via CDN for styling
- **jQuery**: Via CDN for DOM manipulation and events
- **Vanilla JavaScript**: File generation logic

## How It Works

1. User fills form with project details
2. Preview updates in real-time showing generated `strata.toml`
3. On submit, generates complete project structure:
   - `strata.toml` - Project manifest
   - `src/main.str` - Main source file with selected features
   - `README.md` - Generated documentation
   - `.gitignore` - Standard Strata gitignore
4. User receives downloadable project manifest text file

## Generated Project Layout

```
my-awesome-project/
├── strata.toml      # Project manifest with configurations
├── src/
│   └── main.str     # Main program with imports for selected features
├── README.md        # Auto-generated documentation
└── .gitignore       # Standard ignores for Strata projects
```

## Usage

1. Open `index.html` in a browser
2. Fill in project details:
   - Project Name (kebab-case)
   - Version (semantic versioning)
   - Description and Author
3. Select project type (Application or Package)
4. Check desired features
5. Configure build settings
6. Click "Generate Project"
7. Download and extract the generated files

## Features Reference

| Feature | Imports | Use Case |
|---------|---------|----------|
| Math | `std::math` | sin, cos, sqrt, etc. |
| Text | `std::text` | String manipulation |
| Util | `std::util` | Arrays, collections |
| Time | `std::time` | Date/time operations |
| File I/O | `std::file` | Read/write files |

## Project Types

### Application
Executable Strata program with `main()` function entry point.

```strata
func main() => void {
  print("Hello, World!")
}
```

### Package
Reusable library for other projects. Exports functions for consumption.

```toml
[exports]
main = "./src/main.str"
```

## Build Targets

- **C** (default): Compile to C code for performance
- **JavaScript**: Compile to JavaScript for web/Node.js

## Optimization Levels

- **O0**: No optimization (fastest compilation)
- **O1**: Light optimization
- **O2**: Standard optimization (recommended)
- **O3**: Aggressive optimization (slowest compilation)

## Future Enhancements

- [ ] Proper ZIP file download (currently text manifest)
- [ ] Git repository initialization
- [ ] Add to registry feature
- [ ] Template customization
- [ ] Test file generation
- [ ] CI/CD pipeline templates
- [ ] Multiple language examples

## Dependencies

- **CDN Only**: No build process required
  - Tailwind CSS 3.x
  - jQuery 3.6.0

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any modern ES6+ browser

## Extending the Initializer

### Adding New Features

Edit the features section in `index.html`:

```html
<label class="flex items-center cursor-pointer">
    <input type="checkbox" name="features" value="newfeature">
    <span class="ml-3 text-gray-700">
        <span class="font-medium">New Feature</span>
        <span class="text-gray-500 text-sm block">Description</span>
    </span>
</label>
```

Add import mapping in `app.js`:

```javascript
const importMap = {
    'newfeature': 'import * as newfeature from std::newfeature'
};
```

### Adding New Licenses

Add to the select in `index.html`:

```html
<option value="ISC">ISC</option>
```

## Links

- [Strata Repository](https://github.com/VSS-CO/Strata)
- [Package Guide](../packageexample/PACKAGE_GUIDE.md)
- [Getting Started](../README.md)
