package init

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/dscv103/fionacode/cli/internal/assets"
)

// Initialize creates opencode.json and .opencode directory in the target directory
func Initialize(targetDir string) error {
	// Resolve target directory
	if targetDir == "" {
		var err error
		targetDir, err = os.Getwd()
		if err != nil {
			return fmt.Errorf("failed to get current directory: %w", err)
		}
	} else {
		// Create target directory if it doesn't exist
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			return fmt.Errorf("failed to create target directory: %w", err)
		}
	}

	// Check if opencode.json already exists
	opencodeJSONPath := filepath.Join(targetDir, "opencode.json")
	if _, err := os.Stat(opencodeJSONPath); err == nil {
		return fmt.Errorf("opencode.json already exists in %s", targetDir)
	}

	// Check if .opencode directory already exists
	opencodeDirPath := filepath.Join(targetDir, ".opencode")
	if _, err := os.Stat(opencodeDirPath); err == nil {
		return fmt.Errorf(".opencode directory already exists in %s", targetDir)
	}

	// Copy opencode.json
	if err := copyOpencodeJSON(targetDir); err != nil {
		return fmt.Errorf("failed to copy opencode.json: %w", err)
	}

	// Create .opencode directory structure
	if err := os.MkdirAll(filepath.Join(targetDir, ".opencode", "prompts"), 0755); err != nil {
		return fmt.Errorf("failed to create .opencode/prompts directory: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(targetDir, ".opencode", "tool"), 0755); err != nil {
		return fmt.Errorf("failed to create .opencode/tool directory: %w", err)
	}

	// Copy prompt files
	if err := copyPromptFiles(targetDir); err != nil {
		return fmt.Errorf("failed to copy prompt files: %w", err)
	}

	// Copy tool files
	if err := copyToolFiles(targetDir); err != nil {
		return fmt.Errorf("failed to copy tool files: %w", err)
	}

	return nil
}

func copyOpencodeJSON(targetDir string) error {
	content, err := assets.GetOpencodeJSON()
	if err != nil {
		return err
	}

	destPath := filepath.Join(targetDir, "opencode.json")
	return os.WriteFile(destPath, content, 0644)
}

func copyPromptFiles(targetDir string) error {
	promptFiles, err := assets.GetPromptFiles()
	if err != nil {
		return err
	}

	for _, file := range promptFiles {
		content, err := assets.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", file, err)
		}

		// Strip "embedded/" prefix from the path
		destPath := filepath.Join(targetDir, file[9:]) // "embedded/" is 9 characters
		if err := os.WriteFile(destPath, content, 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", destPath, err)
		}
	}

	return nil
}

func copyToolFiles(targetDir string) error {
	toolFiles, err := assets.GetToolFiles()
	if err != nil {
		return err
	}

	for _, file := range toolFiles {
		content, err := assets.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", file, err)
		}

		// Strip "embedded/" prefix from the path
		destPath := filepath.Join(targetDir, file[9:]) // "embedded/" is 9 characters
		if err := os.WriteFile(destPath, content, 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", destPath, err)
		}
	}

	return nil
}
