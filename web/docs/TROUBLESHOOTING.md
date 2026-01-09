# Troubleshooting Guide - Strata Docs

If you're getting errors about slugs not being found, follow this guide.

## Quick Fix (Try This First)

### Option 1: Simple Clean (Usually Works)

```bash
cd web/docs

# Remove astro cache only
rmdir /s /q .astro

# Reinstall dependencies
npm install

# Start
npm run dev
```

### Option 2: Full Clean (If Simple Doesn't Work)

**Windows:**
Run the batch file:
```bash
CLEAN_AND_RUN.bat
```

Or manually:
```bash
rmdir /s /q .astro
rmdir /s /q dist
rmdir /s /q node_modules
npm install
npm run dev
```

### Option 3: Nuclear Clean (Last Resort)

**Windows:**
Run this batch file:
```bash
NUCLEAR_CLEAN.bat
```

This will:
- Delete ALL cache folders
- Clear npm cache
- Reinstall everything from scratch
- Start the dev server

## The Problem

Astro's content layer caches file information. When you switch between `.md` and `.mdx` files, the cache gets confused and can't find the pages.

Symptoms:
```
[ERROR] The slug `"getting-started/introduction"` does not exist
[WARN] Entry docs → 404 was not found
```

## Why It Happens

1. Old `.md` files were indexed
2. We created `.mdx` versions
3. Deleted the `.md` files
4. Cache still has references to old structure
5. Content layer indexing is out of sync

## Solutions (In Order)

### 1. Check Files Exist ✓

```bash
dir src\content\docs\getting-started\
```

Should show:
```
installation.mdx
introduction.mdx
quick-start.mdx
```

No `.md` files should be there!

### 2. Clear .astro Cache

```bash
rmdir /s /q .astro
npm run dev
```

This forces Astro to re-index files.

### 3. Full Node Reinstall

```bash
rmdir /s /q .astro
rmdir /s /q node_modules
rmdir /s /q dist
npm install
npm run dev
```

### 4. Nuclear Option

Use the `NUCLEAR_CLEAN.bat` file:
```bash
NUCLEAR_CLEAN.bat
```

This removes everything and rebuilds from scratch.

## Verify Fix

After running a solution, you should see:

```
✔ Build complete
Local: http://localhost:3000
```

Then visit the URL. If it works, great! If not, try the next solution.

## Files Should Be

### Getting Started
- ✅ `src/content/docs/getting-started/installation.mdx`
- ✅ `src/content/docs/getting-started/introduction.mdx`
- ✅ `src/content/docs/getting-started/quick-start.mdx`

### Guide
- ✅ `src/content/docs/guide/variables-and-types.mdx`
- ✅ `src/content/docs/guide/functions.mdx`
- ✅ `src/content/docs/guide/control-flow.mdx`
- ✅ `src/content/docs/guide/type-system.md` (OK to be .md)

### Examples
- ✅ `src/content/docs/examples/fibonacci.mdx`
- ✅ `src/content/docs/examples/hello-world.md` (OK to be .md)
- ✅ `src/content/docs/examples/factorial.md` (OK to be .md)

### Reference
- ✅ `src/content/docs/reference/builtins.mdx`

### No `.md` Files Should Exist For These:
- installation, introduction, quick-start
- variables-and-types, functions, control-flow
- fibonacci, builtins

## Browser Cache Issue

If the page loads but components aren't working:

1. **Hard refresh the page**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache entirely**
   - DevTools → Application → Storage → Clear Site Data

3. **Close and reopen browser**

## Check npm/Node Version

```bash
node --version     # Should be 18+ 
npm --version      # Should be 8+
```

If too old, update:
```bash
npm install -g npm
```

## Common Errors & Solutions

### Error: "slug does not exist"
**Solution:** Run `rmdir /s /q .astro` then `npm run dev`

### Error: "404 was not found"
**Solution:** Check files exist with correct names (no typos)

### Error: "Cannot find module"
**Solution:** Run `npm install` to reinstall dependencies

### Page loads but no content
**Solution:** Hard refresh browser (Ctrl+Shift+R)

### Dev server won't start
**Solution:** Use NUCLEAR_CLEAN.bat for complete rebuild

## Contact Support

If nothing works:
1. Check the files actually exist in the right folders
2. Verify no duplicate `.md` files remain
3. Try the nuclear clean option
4. Report issue on GitHub

## Success Indicators

When it's working, you'll see:

✅ Dev server starts without errors  
✅ Pages load at http://localhost:3000  
✅ Navigation works  
✅ Tabs can be clicked  
✅ Steps are numbered  
✅ Asides have colors  
✅ Cards display properly  
✅ Dark mode works  
✅ Mobile responsive  

---

Good luck! Most issues resolve with a cache clear. 🚀
