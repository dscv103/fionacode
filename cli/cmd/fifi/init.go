package main

import (
	"fmt"

	initpkg "github.com/dscv103/fionacode/cli/internal/init"
	"github.com/spf13/cobra"
)

var initCmd = &cobra.Command{
	Use:   "init [directory]",
	Short: "Initialize a new FionaCode project",
	Long: `Initialize a new FionaCode project by copying opencode.json and .opencode directory.

If no directory is specified, initializes in the current directory.
If a directory is specified, it will be created if it doesn't exist.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var targetDir string
		if len(args) > 0 {
			targetDir = args[0]
		}

		fmt.Printf("Initializing FionaCode project")
		if targetDir != "" {
			fmt.Printf(" in %s", targetDir)
		} else {
			fmt.Printf(" in current directory")
		}
		fmt.Println("...")

		if err := initpkg.Initialize(targetDir); err != nil {
			return fmt.Errorf("initialization failed: %w", err)
		}

		fmt.Println("\n✓ Successfully initialized FionaCode project!")
		fmt.Println("\nCreated:")
		fmt.Println("  - opencode.json")
		fmt.Println("  - .opencode/prompts/ (14 files)")
		fmt.Println("  - .opencode/tool/ (20 files)")
		fmt.Println("\nNext steps:")
		fmt.Println("  1. Review and customize opencode.json")
		fmt.Println("  2. Set up your API keys in environment variables")
		fmt.Println("  3. Run: opencode")
		fmt.Println("\nFor more information, visit: https://github.com/dscv103/fionacode")

		return nil
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
}
