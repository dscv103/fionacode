package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
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
	// Determine platform-specific archive name
	archiveName := getArchiveName(version)
	downloadURL := fmt.Sprintf("%s/v%s/%s", githubReleaseBase, version, archiveName)

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

	// Download the archive
	resp, err := http.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d. URL: %s", resp.StatusCode, downloadURL)
	}

	// Create temporary file for archive
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

	// Extract binary from archive
	binaryPath, err := extractBinary(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to extract binary: %w", err)
	}
	defer os.Remove(binaryPath)

	// Make binary executable
	if err := os.Chmod(binaryPath, 0755); err != nil {
		return fmt.Errorf("failed to make binary executable: %w", err)
	}

	// Replace the current binary
	// On Unix-like systems, we can rename while the file is in use
	// On Windows, we may need a different approach
	if err := os.Rename(binaryPath, exePath); err != nil {
		// If rename fails, try copying
		if err := copyFile(binaryPath, exePath); err != nil {
			return fmt.Errorf("failed to replace binary: %w", err)
		}
	}

	return nil
}

// getArchiveName returns the platform-specific archive name for downloads
// Format: fifi_{version}_{os}_{arch}.{tar.gz|zip}
func getArchiveName(version string) string {
	osName := runtime.GOOS
	arch := runtime.GOARCH

	// Map OS names to release naming convention
	switch osName {
	case "darwin":
		osName = "macOS"
	case "linux":
		osName = "linux"
	case "windows":
		osName = "windows"
	}

	// Map architecture names
	if arch == "amd64" {
		arch = "amd64"
	} else if arch == "arm64" {
		arch = "arm64"
	}

	if runtime.GOOS == "windows" {
		return fmt.Sprintf("fifi_%s_%s_%s.zip", version, osName, arch)
	}
	return fmt.Sprintf("fifi_%s_%s_%s.tar.gz", version, osName, arch)
}

// extractBinary extracts the fifi binary from a tar.gz or zip archive
func extractBinary(archivePath string) (string, error) {
	if strings.HasSuffix(archivePath, ".zip") {
		return extractFromZip(archivePath)
	}
	return extractFromTarGz(archivePath)
}

// extractFromTarGz extracts the fifi binary from a tar.gz archive
func extractFromTarGz(archivePath string) (string, error) {
	file, err := os.Open(archivePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	gzr, err := gzip.NewReader(file)
	if err != nil {
		return "", err
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}

		// Look for the fifi binary
		if header.Name == "fifi" || filepath.Base(header.Name) == "fifi" {
			// Create temp file for extracted binary
			tmpFile, err := os.CreateTemp("", "fifi-binary-*")
			if err != nil {
				return "", err
			}
			tmpPath := tmpFile.Name()

			if _, err := io.Copy(tmpFile, tr); err != nil {
				tmpFile.Close()
				os.Remove(tmpPath)
				return "", err
			}
			tmpFile.Close()

			return tmpPath, nil
		}
	}

	return "", fmt.Errorf("fifi binary not found in archive")
}

// extractFromZip extracts the fifi binary from a zip archive
func extractFromZip(archivePath string) (string, error) {
	r, err := zip.OpenReader(archivePath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	for _, f := range r.File {
		// Look for the fifi.exe binary
		if f.Name == "fifi.exe" || filepath.Base(f.Name) == "fifi.exe" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			defer rc.Close()

			// Create temp file for extracted binary
			tmpFile, err := os.CreateTemp("", "fifi-binary-*.exe")
			if err != nil {
				return "", err
			}
			tmpPath := tmpFile.Name()

			if _, err := io.Copy(tmpFile, rc); err != nil {
				tmpFile.Close()
				os.Remove(tmpPath)
				return "", err
			}
			tmpFile.Close()

			return tmpPath, nil
		}
	}

	return "", fmt.Errorf("fifi.exe binary not found in archive")
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
