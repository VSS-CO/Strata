// Strata Initializer - Application Logic

$(document).ready(function() {
    // Initialize preview on load
    updatePreview();

    // Update preview on any form change
    $('#initForm').on('change input', updatePreview);

    // Handle form submission
    $('#initForm').on('submit', function(e) {
        e.preventDefault();
        generateProject();
    });

    // Modal controls
    $('#closeModal').on('click', function() {
        $('#downloadModal').addClass('hidden');
    });
});

function updatePreview() {
    const projectName = $('#projectName').val() || 'my-awesome-project';
    const version = $('#version').val() || '0.1.0';
    const description = $('#description').val() || 'A Strata project';
    const author = $('#author').val() || 'Your Name';
    const projectType = $('input[name="projectType"]:checked').val();
    const target = $('#target').val();
    const optimization = $('#optimization').val();
    const license = $('#license').val();
    const features = getSelectedFeatures();

    // Update structure info
    const structureType = projectType === 'package' ? 'package' : 'application';
    $('#structureInfo').text(structureType);
    $('#featureCount').text(features.length);

    // Generate TOML preview
    let tomlContent = `[project]
name = "${projectName}"
version = "${version}"
description = "${description}"
author = "${author}"
license = "${license}"
strata = "1.0.0"

[build]
target = "${target}"
optimization = "${optimization}"`;

    if (features.length > 0) {
        tomlContent += `\n\n[dependencies]`;
        features.forEach(feature => {
            tomlContent += `\n# ${feature} = "1.0.0"`;
        });
    }

    if (projectType === 'package') {
        tomlContent += `\n\n[exports]
main = "./src/main.str"`;
    }

    $('#previewContent').text(tomlContent);
}

function getSelectedFeatures() {
    const features = [];
    $('input[name="features"]:checked').each(function() {
        features.push($(this).val());
    });
    return features;
}

function generateProject() {
    const projectName = $('#projectName').val();
    
    if (!projectName || projectName.trim() === '') {
        alert('Please enter a project name');
        return;
    }

    if (!/^[a-z0-9-]+$/.test(projectName)) {
        alert('Project name must be lowercase alphanumeric with hyphens only');
        return;
    }

    // Collect form data
    const formData = {
        projectName: projectName,
        version: $('#version').val(),
        description: $('#description').val(),
        author: $('#author').val(),
        projectType: $('input[name="projectType"]:checked').val(),
        target: $('#target').val(),
        optimization: $('#optimization').val(),
        license: $('#license').val(),
        features: getSelectedFeatures()
    };

    // Generate files
    const files = generateFiles(formData);

    // Create and download ZIP
    downloadZip(projectName, files);

    // Show success modal
    $('#downloadModal').removeClass('hidden');
}

function generateFiles(config) {
    const files = {};
    const name = config.projectName;

    // strata.toml
    let strataTOML = `[project]
name = "${name}"
version = "${config.version}"
description = "${config.description}"
author = "${config.author}"
license = "${config.license}"
strata = "1.0.0"

[build]
target = "${config.target}"
optimization = "${config.optimization}"`;

    if (config.features.length > 0) {
        strataTOML += `\n\n[dependencies]`;
        config.features.forEach(feature => {
            strataTOML += `\n# ${feature} = "1.0.0"`;
        });
    }

    if (config.projectType === 'package') {
        strataTOML += `\n\n[exports]
main = "./src/main.str"`;
    }

    files['strata.toml'] = strataTOML;

    // src/main.str
    let mainStr = generateMainFile(config);
    files['src/main.str'] = mainStr;

    // README.md
    files['README.md'] = generateREADME(config);

    // .gitignore
    files['.gitignore'] = generateGitignore();

    // For packages, add additional files
    if (config.projectType === 'package') {
        files['PACKAGE.md'] = generatePackageGuide(config);
    }

    return files;
}

function generateMainFile(config) {
    let imports = [];
    const importMap = {
        'math': 'import * as math from std::math',
        'text': 'import * as text from std::text',
        'util': 'import * as util from std::util',
        'time': 'import * as time from std::time',
        'file': 'import * as file from std::file'
    };

    config.features.forEach(feature => {
        if (importMap[feature]) {
            imports.push(importMap[feature]);
        }
    });

    let mainStr = '';
    
    if (imports.length > 0) {
        mainStr = imports.join('\n') + '\n\n';
    }

    if (config.projectType === 'package') {
        mainStr += `// Package: ${config.projectName}
// ${config.description}

func add(a: int, b: int) => int {
  return a + b
}

func greet(name: string) => string {
  return "Hello, " + name
}`;
    } else {
        mainStr += `func main() => void {
  print("Welcome to ${config.projectName}")
  
  // Start coding here!
}

main()`;
    }

    return mainStr;
}

function generateREADME(config) {
    const type = config.projectType === 'package' ? 'Package' : 'Application';
    
    return `# ${config.projectName}

${config.description}

## Getting Started

### Prerequisites
- Strata compiler v${config.version || '1.0.0'}+

### Building
\`\`\`bash
strata build
\`\`\`

### Running
\`\`\`bash
${config.projectType === 'package' ? 'strata build --lib' : 'strata run'}
\`\`\`

## Project Structure

\`\`\`
${config.projectName}/
├── strata.toml      # Project manifest
├── src/
│   └── main.str     # Main source file
├── README.md        # This file
└── .gitignore
\`\`\`

## Features Included

${config.features.length > 0 ? config.features.map(f => `- ${f}`).join('\n') : '- None selected'}

## License

${config.license}

## Author

${config.author || 'Your Name'}

---

Generated by [Strata Initializer](https://github.com/VSS-CO/Strata)`;
}

function generateGitignore() {
    return `# Strata build artifacts
dist/
build/
*.out
*.o

# Dependencies
.strata/
strata.lock

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local`;
}

function generatePackageGuide(config) {
    return `# ${config.projectName} Package Guide

This is a Strata package library.

## Using in Your Projects

Add to your \`strata.toml\`:

\`\`\`toml
[dependencies]
${config.projectName} = { path = "./path/to/this/package" }
\`\`\`

Then import:

\`\`\`strata
import * as ${config.projectName.replace(/-/g, '_')} from ${config.projectName}
\`\`\`

## Publishing

To publish this package:

\`\`\`bash
strata publish
\`\`\`

Ensure version is bumped in \`strata.toml\` before publishing.`;
}

function downloadZip(projectName, files) {
    const zip = new JSZip();
    
    // Add all files to the zip with proper directory structure
    Object.keys(files).forEach(filePath => {
        zip.file(filePath, files[filePath]);
    });
    
    // Generate the zip file
    zip.generateAsync({ type: 'blob' }).then(function(blob) {
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }).catch(function(err) {
        console.error('Error generating ZIP:', err);
        alert('Error generating ZIP file. Check console for details.');
    });
}
