package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/spf13/cobra"
)

const (
	githubReleasesAPI = "https://api.github.com/repos/dscv103/fionacode/releases/latest"
	githubReleaseBase = "https://github.com/dscv103/fionacode/releases/download"
)

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update fifi to the latest version",
	Long: `Update fifi CLI to the latest version from GitHub releases.

This command will download the latest version for your platform and replace
the current binary. Requires write access to the fifi installation directory.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("Checking for updates...")

		latestVersion, err := getLatestVersion()
		if err != nil {
			return fmt.Errorf("failed to check for updates: %w", err)
		}

		currentVersion := strings.TrimPrefix(Version, "v")
		latestVersion = strings.TrimPrefix(latestVersion, "v")

		if currentVersion == latestVersion {
			fmt.Printf("✓ You're already on the latest version (v%s)\n", currentVersion)
			return nil
		}

		fmt.Printf("Current version: v%s\n", currentVersion)
		fmt.Printf("Latest version:  v%s\n", latestVersion)
		fmt.Println("\nDownloading update...")

		if err := downloadAndInstall(latestVersion); err != nil {
			return fmt.Errorf("update failed: %w", err)
		}

		fmt.Printf("\n✓ Successfully updated to v%s!\n", latestVersion)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(updateCmd)
}

// getLatestVersion fetches the latest release version from GitHub API
func getLatestVersion() (string, error) {
	resp, err := http.Get(githubReleasesAPI)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Simple JSON parsing to extract tag_name
	// This is a simple approach to avoid adding a JSON library dependency
	bodyStr := string(body)
	tagIndex := strings.Index(bodyStr, `"tag_name"`)
	if tagIndex == -1 {
		return "", fmt.Errorf("could not find tag_name in response")
	}

	// Find the value after "tag_name":"
	startIndex := strings.Index(bodyStr[tagIndex:], `":"`) + tagIndex + 3
	endIndex := strings.Index(bodyStr[startIndex:], `"`) + startIndex

	if startIndex < 0 || endIndex < 0 {
		return "", fmt.Errorf("could not parse tag_name from response")
	}

	return bodyStr[startIndex:endIndex], nil
}

// downloadAndInstall downloads the binary for the current platform and replaces the current one
func downloadAndInstall(version string) error {
	// Determine platform-specific binary name
	binaryName := getBinaryName()
	downloadURL := fmt.Sprintf("%s/v%s/%s", githubReleaseBase, version, binaryName)

	// Get the path to the current executable
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Resolve symlinks
	exePath, err = filepath.EvalSymlinks(exePath)
	if err != nil {
		return fmt.Errorf("failed to resolve symlinks: %w", err)
	}

	// Download the new binary
	resp, err := http.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d. URL: %s", resp.StatusCode, downloadURL)
	}

	// Create temporary file
	tmpFile, err := os.CreateTemp("", "fifi-update-*")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	// Write downloaded content to temp file
	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to write temp file: %w", err)
	}
	tmpFile.Close()

	// Make temp file executable
	if err := os.Chmod(tmpPath, 0755); err != nil {
		return fmt.Errorf("failed to make temp file executable: %w", err)
	}

	// Replace the current binary
	// On Unix-like systems, we can rename while the file is in use
	// On Windows, we may need a different approach
	if err := os.Rename(tmpPath, exePath); err != nil {
		// If rename fails, try copying
		if err := copyFile(tmpPath, exePath); err != nil {
			return fmt.Errorf("failed to replace binary: %w", err)
		}
	}

	return nil
}

// getBinaryName returns the platform-specific binary name for downloads
func getBinaryName() string {
	osName := runtime.GOOS
	arch := runtime.GOARCH

	// Map to the naming convention used in releases
	if osName == "darwin" {
		osName = "Darwin"
	} else if osName == "linux" {
		osName = "Linux"
	} else if osName == "windows" {
		osName = "Windows"
	}

	if arch == "amd64" {
		arch = "x86_64"
	} else if arch == "arm64" {
		arch = "arm64"
	}

	if runtime.GOOS == "windows" {
		return fmt.Sprintf("fifi_%s_%s.exe", osName, arch)
	}
	return fmt.Sprintf("fifi_%s_%s", osName, arch)
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return err
	}

	// Copy permissions
	sourceInfo, err := os.Stat(src)
	if err != nil {
		return err
	}

	return os.Chmod(dst, sourceInfo.Mode())
}

// checkForUpdates checks if a newer version is available and prints a message
func checkForUpdates() {
	latestVersion, err := getLatestVersion()
	if err != nil {
		// Silently fail version check - don't interrupt user workflow
		return
	}

	currentVersion := strings.TrimPrefix(Version, "v")
	latestVersion = strings.TrimPrefix(latestVersion, "v")

	if currentVersion == "dev" {
		// Don't show update message for development builds
		return
	}

	if currentVersion != latestVersion && latestVersion != "" {
		fmt.Fprintf(os.Stderr, "\n")
		fmt.Fprintf(os.Stderr, "╭────────────────────────────────────────────────╮\n")
		fmt.Fprintf(os.Stderr, "│  A new version of fifi is available!          │\n")
		fmt.Fprintf(os.Stderr, "│  Current: v%-8s  Latest: v%-8s       │\n", currentVersion, latestVersion)
		fmt.Fprintf(os.Stderr, "│                                                │\n")
		fmt.Fprintf(os.Stderr, "│  Run: fifi update                              │\n")
		fmt.Fprintf(os.Stderr, "╰────────────────────────────────────────────────╯\n")
		fmt.Fprintf(os.Stderr, "\n")
	}
}
