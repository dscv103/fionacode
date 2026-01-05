package main

import (
	"fmt"

	"github.com/dscv103/fionacode/cli/internal/validate"
	"github.com/spf13/cobra"
)

var (
	showSummary bool
)

var validateCmd = &cobra.Command{
	Use:   "validate [directory]",
	Short: "Validate an existing FionaCode configuration",
	Long: `Validate an existing FionaCode configuration by checking opencode.json and .opencode directory.

If no directory is specified, validates the current directory.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var targetDir string
		if len(args) > 0 {
			targetDir = args[0]
		}

		fmt.Printf("Validating FionaCode configuration")
		if targetDir != "" {
			fmt.Printf(" in %s", targetDir)
		} else {
			fmt.Printf(" in current directory")
		}
		fmt.Println("...")

		if err := validate.Validate(targetDir); err != nil {
			return fmt.Errorf("validation failed: %w", err)
		}

		fmt.Println("\n✓ Configuration is valid!")

		if showSummary {
			fmt.Println()
			summary, err := validate.GetSummary(targetDir)
			if err != nil {
				return fmt.Errorf("failed to get summary: %w", err)
			}
			fmt.Println(summary)
		}

		return nil
	},
}

func init() {
	validateCmd.Flags().BoolVarP(&showSummary, "summary", "s", false, "Show configuration summary")
	rootCmd.AddCommand(validateCmd)
}
