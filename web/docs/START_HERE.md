# 🚀 START HERE - Getting the Docs Running

## Quick Start (Copy & Paste)

### Windows (PowerShell)

```powershell
cd web\docs

# Clean everything
Remove-Item -Path '.astro' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path 'dist' -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall and run
npm install
npm run dev
```

### Windows (Command Prompt)

```batch
cd web\docs
rmdir /s /q .astro
rmdir /s /q node_modules  
rmdir /s /q dist
npm install
npm run dev
```

### Linux/macOS (Bash)

```bash
cd web/docs

# Clean
rm -rf .astro node_modules dist

# Reinstall and run
npm install
npm run dev
```

## OR Use Batch Files (Windows)

**Easy way (doesn't require manual commands):**

1. Navigate to `web\docs\`
2. Double-click `CLEAN_AND_RUN.bat`
3. Wait for it to finish
4. Open browser to `http://localhost:3000`

**Nuclear clean (if nothing else works):**

1. Navigate to `web\docs\`
2. Double-click `NUCLEAR_CLEAN.bat`
3. Wait for it to finish
4. Open browser to `http://localhost:3000`

## Expected Output

After running the commands, you should see:

```
✔ build complete

  Local: http://localhost:3000
  ➜ press h for help
```

Then your browser should open to **http://localhost:3000** and you'll see the beautiful Strata documentation!

## What You'll See

A professional documentation site with:

✅ **Navigation** — Getting Started, Language Guide, Examples, API Reference  
✅ **Tabs** — Switch between options (OS, code examples, etc.)  
✅ **Steps** — Numbered instructions  
✅ **Asides** — Color-coded tips, notes, warnings  
✅ **Cards** — Feature showcases and navigation  
✅ **Dark Mode** — Theme toggle in top right  
✅ **Search** — Built-in search functionality  
✅ **Mobile Friendly** — Works great on all devices  

## Troubleshooting

If you get errors:

1. **"slug does not exist"** → Run `rmdir /s /q .astro` then retry
2. **Port 3000 in use** → Kill the process or use `npm run dev -- --port 3001`
3. **npm not found** → Install Node.js from nodejs.org
4. **Still broken?** → See `TROUBLESHOOTING.md` in this folder

## File Structure

```
web/docs/
├── src/
│   ├── content/
│   │   └── docs/          ← All documentation pages
│   │       ├── getting-started/
│   │       ├── guide/
│   │       ├── examples/
│   │       └── reference/
│   └── content.config.ts  ← Content configuration
├── astro.config.mjs       ← Main configuration
├── package.json
└── CLEAN_AND_RUN.bat      ← Easy cleanup script
```

## Pages Available

Once running, visit:

- **http://localhost:3000** — Home
- **http://localhost:3000/getting-started/introduction** — Intro
- **http://localhost:3000/getting-started/installation** — Install guide
- **http://localhost:3000/getting-started/quick-start** — Quick start
- **http://localhost:3000/guide/variables-and-types** — Variables guide
- **http://localhost:3000/guide/functions** — Functions guide
- **http://localhost:3000/guide/control-flow** — Control flow guide
- **http://localhost:3000/reference/builtins** — API reference

## Building for Production

```bash
npm run build
```

Output goes to `dist/` — ready to deploy anywhere!

## Need Help?

- **Troubleshooting** → See `TROUBLESHOOTING.md`
- **Batch scripts** → `CLEAN_AND_RUN.bat` or `NUCLEAR_CLEAN.bat`
- **Astro docs** → https://docs.astro.build
- **Starlight docs** → https://starlight.astro.build
- **GitHub issues** → https://github.com/VSS-CO/Strata/issues

---

**That's it!** Follow the quick start commands above and you'll have the docs running in seconds. 🚀
