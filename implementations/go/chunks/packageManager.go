package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// ============================================================================
// PACKAGE MANAGER - Dependency management with Strataumfile
// ============================================================================

type StrataumfileConfig struct {
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Registry     string            `json:"registry,omitempty"`
	Dependencies map[string]string `json:"dependencies,omitempty"`
}

type LockPackage struct {
	Version   string `json:"version"`
	Installed bool   `json:"installed"`
	Timestamp string `json:"timestamp"`
}

type LockFile struct {
	Locked    bool                    `json:"locked"`
	Version   string                  `json:"version,omitempty"`
	Timestamp string                  `json:"timestamp,omitempty"`
	Packages  map[string]*LockPackage `json:"packages,omitempty"`
}

type PackageManager struct {
	ProjectRoot  string
	Strataumfile StrataumfileConfig
	LockFile     LockFile
}

func NewPackageManager(projectRoot string) *PackageManager {
	if projectRoot == "" {
		projectRoot, _ = os.Getwd()
	}
	pm := &PackageManager{ProjectRoot: projectRoot}
	pm.loadStrataumfile()
	pm.loadLockFile()
	return pm
}

func (pm *PackageManager) loadStrataumfile() {
	path := pm.ProjectRoot + "/Strataumfile"
	data, err := os.ReadFile(path)
	if err != nil {
		pm.Strataumfile = StrataumfileConfig{Name: "unknown", Version: "0.0.0", Dependencies: make(map[string]string)}
		return
	}
	json.Unmarshal(data, &pm.Strataumfile)
	if pm.Strataumfile.Dependencies == nil {
		pm.Strataumfile.Dependencies = make(map[string]string)
	}
}

func (pm *PackageManager) loadLockFile() {
	path := pm.ProjectRoot + "/Strataumfile.lock"
	data, err := os.ReadFile(path)
	if err != nil {
		pm.LockFile = LockFile{Locked: false, Packages: make(map[string]*LockPackage)}
		return
	}
	json.Unmarshal(data, &pm.LockFile)
	if pm.LockFile.Packages == nil {
		pm.LockFile.Packages = make(map[string]*LockPackage)
	}
}

func (pm *PackageManager) saveStrataumfile() {
	path := pm.ProjectRoot + "/Strataumfile"
	data, _ := json.MarshalIndent(pm.Strataumfile, "", "  ")
	os.WriteFile(path, data, 0644)
	fmt.Printf("✓ Updated %s\n", path)
}

func (pm *PackageManager) saveLockFile() {
	path := pm.ProjectRoot + "/Strataumfile.lock"
	pm.LockFile.Timestamp = time.Now().Format(time.RFC3339)
	data, _ := json.MarshalIndent(pm.LockFile, "", "  ")
	os.WriteFile(path, data, 0644)
	fmt.Printf("✓ Locked dependencies in %s\n", path)
}

func (pm *PackageManager) Install(packageName string) {
	packagesDir := pm.ProjectRoot + "/.strata/packages"
	os.MkdirAll(packagesDir, 0755)

	if packageName != "" {
		pm.installPackage(packageName, packagesDir, "")
	} else {
		if len(pm.Strataumfile.Dependencies) == 0 {
			fmt.Println("No dependencies to install.")
			return
		}
		for pkg, version := range pm.Strataumfile.Dependencies {
			pm.installPackage(pkg, packagesDir, version)
		}
	}
	pm.saveLockFile()
	fmt.Println("✓ Installation complete")
}

func (pm *PackageManager) installPackage(packageName, packagesDir, version string) {
	if version == "" {
		version = "1.0.0"
	}
	pkgDir := packagesDir + "/" + packageName
	os.MkdirAll(pkgDir, 0755)

	moduleContent := fmt.Sprintf(`// %s module (v%s)
export func init() => void {
    io.print("%s loaded")
}
`, packageName, version, packageName)
	os.WriteFile(pkgDir+"/index.str", []byte(moduleContent), 0644)

	pkgInfo := map[string]string{"name": packageName, "version": version, "main": "index.str"}
	data, _ := json.MarshalIndent(pkgInfo, "", "  ")
	os.WriteFile(pkgDir+"/package.json", data, 0644)

	pm.LockFile.Packages[packageName] = &LockPackage{
		Version:   version,
		Installed: true,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	fmt.Printf("✓ Installed %s@%s\n", packageName, version)
}

func (pm *PackageManager) Add(packageName, version string) {
	if version == "" {
		version = "latest"
	}
	pm.Strataumfile.Dependencies[packageName] = version
	pm.saveStrataumfile()

	packagesDir := pm.ProjectRoot + "/.strata/packages"
	os.MkdirAll(packagesDir, 0755)
	pm.installPackage(packageName, packagesDir, version)
	pm.saveLockFile()
	fmt.Printf("✓ Added %s@%s\n", packageName, version)
}

func (pm *PackageManager) Remove(packageName string) {
	if _, ok := pm.Strataumfile.Dependencies[packageName]; ok {
		delete(pm.Strataumfile.Dependencies, packageName)
		pm.saveStrataumfile()

		pkgDir := pm.ProjectRoot + "/.strata/packages/" + packageName
		os.RemoveAll(pkgDir)

		delete(pm.LockFile.Packages, packageName)
		pm.saveLockFile()
		fmt.Printf("✓ Removed %s\n", packageName)
	} else {
		fmt.Fprintf(os.Stderr, "Package %s not found in dependencies\n", packageName)
		os.Exit(1)
	}
}

func (pm *PackageManager) List() {
	fmt.Println("\nInstalled Packages:")
	fmt.Println("==================")
	if len(pm.Strataumfile.Dependencies) == 0 {
		fmt.Println("No packages installed")
		return
	}
	for pkg, version := range pm.Strataumfile.Dependencies {
		status := "✗"
		if pm.LockFile.Packages[pkg] != nil && pm.LockFile.Packages[pkg].Installed {
			status = "✓"
		}
		fmt.Printf("%s %s@%s\n", status, pkg, version)
	}
}

func (pm *PackageManager) Init(name, version string) {
	if version == "" {
		version = "0.0.1"
	}
	strataumfile := StrataumfileConfig{
		Name:         name,
		Version:      version,
		Registry:     "https://registry.stratauim.io",
		Dependencies: make(map[string]string),
	}
	data, _ := json.MarshalIndent(strataumfile, "", "  ")
	os.WriteFile(pm.ProjectRoot+"/Strataumfile", data, 0644)

	lockFile := LockFile{
		Locked:    true,
		Version:   "1.0",
		Timestamp: time.Now().Format(time.RFC3339),
		Packages:  make(map[string]*LockPackage),
	}
	data, _ = json.MarshalIndent(lockFile, "", "  ")
	os.WriteFile(pm.ProjectRoot+"/Strataumfile.lock", data, 0644)

	fmt.Printf("✓ Initialized Strata project: %s\n", name)
}

func (pm *PackageManager) Info() {
	fmt.Println("\nProject Information:")
	fmt.Println("====================")
	fmt.Printf("Name: %s\n", pm.Strataumfile.Name)
	fmt.Printf("Version: %s\n", pm.Strataumfile.Version)
	registry := pm.Strataumfile.Registry
	if registry == "" {
		registry = "default"
	}
	fmt.Printf("Registry: %s\n", registry)
	fmt.Printf("Dependencies: %d\n", len(pm.Strataumfile.Dependencies))
}
