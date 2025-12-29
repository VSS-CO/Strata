# Strata Packages Hosting

This repository hosts official and community Strata packages. Packages are accessible for direct import into your Strata projects by downloading the code — **installation via CLI is not supported**.

## Structure

```
/packages/
  /<package-name>/
    /<version>/
      <package-name>.str
      metadata.json
```

### Example

```
/packages/
  /str.math/
    /1.0.0/
      str.math.str
      metadata.json
  /str.util/
    /1.2.1/
      str.util.str
      metadata.json
```

* `metadata.json` contains package info:

```json
{
  "name": "str.math",
  "version": "1.0.0",
  "description": "Math utilities for Strata",
  "dependencies": []
}
```

## Usage

### Importing a Package in Strata

To use a package, download the `.str` file directly and import it in your project:

```strata
import "./packages/str.math/1.0.0/str.math.str"

io.print(math.sqrt(16))
```

> Note: The path should point to the downloaded `.str` file relative to your project.

## Hosting Guidelines

* Each package must be in its own folder and versioned.
* Include a `metadata.json` with `name`, `version`, `description`, and optional `dependencies`.
* Versioning follows semantic versioning: `MAJOR.MINOR.PATCH`.
* Packages are read-only once published. New versions require a new folder.

## Accessing Packages

Packages are accessible via URLs:

```
https://cdn.jsdelivr.net/gh/VSS-CO/Strata/packages/<package-name>/<version>/<package-name>.str
```

```

Users can download these files and directly import them into their projects.
