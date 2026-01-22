package main

import (
	"fmt"
	"os"
	"time"
)

// ============================================================================
// MAIN - Entry point for Strata interpreter and package manager
// ============================================================================

func main() {
	args := os.Args[1:]

	if len(args) > 0 {
		command := args[0]
		pm := NewPackageManager("")

		switch command {
		case "init":
			projectName := "my-strata-project"
			version := "0.0.1"
			if len(args) > 1 {
				projectName = args[1]
			}
			if len(args) > 2 {
				version = args[2]
			}
			pm.Init(projectName, version)
			return
		case "install":
			pkgName := ""
			if len(args) > 1 {
				pkgName = args[1]
			}
			pm.Install(pkgName)
			return
		case "add":
			if len(args) < 2 {
				fmt.Fprintln(os.Stderr, "Usage: strataum add <package> [version]")
				os.Exit(1)
			}
			version := "latest"
			if len(args) > 2 {
				version = args[2]
			}
			pm.Add(args[1], version)
			return
		case "remove":
			if len(args) < 2 {
				fmt.Fprintln(os.Stderr, "Usage: strataum remove <package>")
				os.Exit(1)
			}
			pm.Remove(args[1])
			return
		case "list":
			pm.List()
			return
		case "info":
			pm.Info()
			return
		}
	}

	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "Usage: strata <file.str> or strataum <command>")
		os.Exit(1)
	}

	startTime := time.Now()

	filePath := args[0]
	source, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	parser := NewParser(string(source))
	statements, err := parser.Parse()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	typeChecker := NewTypeChecker()
	if err := typeChecker.Check(statements); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	interpreter := NewInterpreter()
	if err := interpreter.Interpret(statements); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	elapsed := time.Since(startTime)
	fmt.Fprintf(os.Stderr, "Executed in %.2fms\n", float64(elapsed.Nanoseconds())/1e6)
}
