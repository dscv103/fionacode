package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	// Version is set during build via ldflags
	Version = "dev"
	// BuildDate is set during build via ldflags
	BuildDate = "unknown"
)

var rootCmd = &cobra.Command{
	Use:   "fifi",
	Short: "FionaCode CLI - Initialize OpenCode AI projects",
	Long: `fifi is a command-line tool for initializing OpenCode AI projects.

It packages the FionaCode configuration (opencode.json) and all associated
prompts and tools, making it easy to start new projects with a proven
multi-agent AI development framework.`,
	Version: Version,
}

func init() {
	rootCmd.SetVersionTemplate(fmt.Sprintf("fifi version %s (built %s)\n", Version, BuildDate))
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
