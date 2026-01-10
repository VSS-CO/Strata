# Build Strata Windows Installer

## Prerequisites

1. **Inno Setup 6.0+** installed
   - Download from: https://jrsoftware.org/isdl.php

2. **strata.exe** compiled
   - Located at: `G:\Strata\build\win32\strata.exe`

3. **Strata compiled to dist/**
   ```bash
   cd G:\Strata
   npm run build
   ```

4. **SDK compiled to sdk/dist/**
   ```bash
   cd G:\Strata\sdk
   npm run build
   ```

## Build Steps

### Step 1: Build the Compiler
```bash
cd G:\Strata
npm run build
```

### Step 2: Build the SDK
```bash
cd G:\Strata\sdk
npm run build
```

### Step 3: Compile the Installer

**Option A: Using Inno Setup GUI**
1. Open Inno Setup
2. File → Open → `G:\Strata\build\win32\Strata.iss`
3. Click "Compile"
4. Output will be in `G:\Strata\build\win32\Output\`

**Option B: Command Line**
```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "G:\Strata\build\win32\Strata.iss"
```

## Output

The compiled installer will be at:
```
G:\Strata\build\win32\Output\StrataExtended-1.0.0-Setup.exe
```

## Configuration

### File Paths
All paths in `Strata.iss` are configured for:
```
G:\Strata\        - Main source
G:\Strata\dist\   - Compiled JS
G:\Strata\sdk\    - SDK files
```

If your paths differ, update:
- `Source: "G:\Strata\..."` in the [Files] section

### Installer Name
To change the installer name, edit:
```
OutputBaseFilename=StrataExtended-1.0.0-Setup
```

### Installation Path
Default installation path is:
```
{autopf}\Strata   (C:\Program Files\Strata on x64)
```

To change, edit:
```
DefaultDirName={autopf}\Strata
```

## Installer Features

The installer includes:

✅ **Main Components**
- strata.exe - Command-line compiler
- dist/main.js - Runtime
- dist/index.js - SDK entry point

✅ **Documentation**
- README.md
- ARCHITECTURE.md
- AGENTS.md

✅ **Examples**
- 01_basic_types.str
- 02_arithmetic.str
- 03_comparison.str
- 10_functions.str

✅ **SDK** (optional component)
- IDE launcher
- CLI tools
- Development libraries

✅ **Features**
- Add to PATH option
- File associations (.str files)
- Desktop shortcut (optional)
- Uninstall support
- Registry entries

## Troubleshooting

### "File not found" errors
Check that these files exist:
- `G:\Strata\build\win32\strata.exe`
- `G:\Strata\dist\main.js`
- `G:\Strata\package.json`
- `G:\Strata\README.md`

Build missing files:
```bash
cd G:\Strata
npm run build
```

### Inno Setup not found
Install Inno Setup from: https://jrsoftware.org/isdl.php

### Permission denied
Run command prompt as Administrator.

## Version Updates

To create a new version installer:

1. Update version in `package.json`
2. Update in `Strata.iss`:
   ```
   #define MyAppVersion "1.1.0"
   OutputBaseFilename=StrataExtended-1.1.0-Setup
   ```
3. Rebuild and recompile

## Distribution

Once compiled, distribute:
```
StrataExtended-1.0.0-Setup.exe
```

Users can install with default options or customize:
- Installation location
- Components (docs, examples, SDK)
- Create shortcuts
- Add to PATH
- File associations

## Next Steps

1. Build compiler: `npm run build`
2. Build SDK: `npm run build` (in sdk/)
3. Compile installer: `ISCC.exe Strata.iss`
4. Test installer: Run `StrataExtended-1.0.0-Setup.exe`
5. Distribute to users

---

**Strata Extended - Professional Windows Installer**
