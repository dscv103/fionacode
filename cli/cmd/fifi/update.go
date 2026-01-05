package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"encoding/json"
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
)

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update fifi to the latest version",
	Long: `Update fifi CLI to the latest version from GitHub releases.

This command will download the latest version for your platform and replace
the current binary. Requires write access to the fifi installation directory.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("Checking for updates...")

		latestRelease, err := getLatestRelease()
		if err != nil {
			return fmt.Errorf("failed to check for updates: %w", err)
		}

		latestVersion := strings.TrimPrefix(latestRelease.TagName, "v")
		currentVersion := strings.TrimPrefix(Version, "v")

		if currentVersion == latestVersion {
			fmt.Printf("✓ You're already on the latest version (v%s)\n", currentVersion)
			return nil
		}

		fmt.Printf("Current version: v%s\n", currentVersion)
		fmt.Printf("Latest version:  v%s\n", latestVersion)
		fmt.Println("\nDownloading update...")

		asset, err := findAssetForPlatform(latestRelease, latestVersion)
		if err != nil {
			return fmt.Errorf("update failed: %w", err)
		}

		if err := downloadAndInstall(asset); err != nil {
			return fmt.Errorf("update failed: %w", err)
		}

		fmt.Printf("\n✓ Successfully updated to v%s!\n", latestVersion)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(updateCmd)
}

type releaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type releaseInfo struct {
	TagName string         `json:"tag_name"`
	Assets  []releaseAsset `json:"assets"`
}

// getLatestRelease fetches the latest release metadata (tag + assets) from GitHub API
func getLatestRelease() (*releaseInfo, error) {
	resp, err := http.Get(githubReleasesAPI)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var release releaseInfo
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, err
	}

	if release.TagName == "" {
		return nil, fmt.Errorf("could not find tag_name in response")
	}

	return &release, nil
}

// getLatestVersion is kept for lightweight version checks elsewhere
func getLatestVersion() (string, error) {
	release, err := getLatestRelease()
	if err != nil {
		return "", err
	}
	return release.TagName, nil
}

// findAssetForPlatform selects the correct release asset for the current OS/arch.
// Falls back to legacy naming (e.g., fifi_Linux_x86_64) for older releases.
func findAssetForPlatform(release *releaseInfo, version string) (*releaseAsset, error) {
	osSlug := runtime.GOOS
	archSlug := runtime.GOARCH

	switch osSlug {
	case "darwin":
		osSlug = "macOS"
	case "linux":
		osSlug = "linux"
	case "windows":
		osSlug = "windows"
	}

	legacyOS := strings.ToUpper(osSlug[:1]) + osSlug[1:]
	legacyArch := archSlug
	if archSlug == "amd64" {
		legacyArch = "x86_64"
	}

	candidates := []string{
		fmt.Sprintf("fifi_%s_%s_%s.tar.gz", version, osSlug, archSlug),
		fmt.Sprintf("fifi_%s_%s_%s.zip", version, osSlug, archSlug),
		fmt.Sprintf("fifi_%s_%s_%s.tar.gz", "v"+version, osSlug, archSlug),
		fmt.Sprintf("fifi_%s_%s_%s.zip", "v"+version, osSlug, archSlug),
		fmt.Sprintf("fifi_%s_%s", legacyOS, legacyArch),
		fmt.Sprintf("fifi_%s_%s.tar.gz", legacyOS, legacyArch),
		fmt.Sprintf("fifi_%s_%s.zip", legacyOS, legacyArch),
	}

	for _, candidate := range candidates {
		for i := range release.Assets {
			if strings.EqualFold(release.Assets[i].Name, candidate) {
				return &release.Assets[i], nil
			}
		}
	}

	for i := range release.Assets {
		name := strings.ToLower(release.Assets[i].Name)
		if strings.Contains(name, strings.ToLower(osSlug)) &&
			(strings.Contains(name, strings.ToLower(archSlug)) || strings.Contains(name, strings.ToLower(legacyArch))) {
			return &release.Assets[i], nil
		}
	}

	names := make([]string, 0, len(release.Assets))
	for _, a := range release.Assets {
		names = append(names, a.Name)
	}

	return nil, fmt.Errorf("no matching asset for %s/%s in release %s (assets: %s)", runtime.GOOS, runtime.GOARCH, release.TagName, strings.Join(names, ", "))
}

// downloadAndInstall downloads the binary for the current platform and replaces the current one
func downloadAndInstall(asset *releaseAsset) error {
	if asset == nil {
		return fmt.Errorf("no release asset provided")
	}

	downloadURL := asset.BrowserDownloadURL
	nameLower := strings.ToLower(asset.Name)
	tmpPattern := "fifi-update-*.tar.gz"
	if strings.HasSuffix(nameLower, ".zip") {
		tmpPattern = "fifi-update-*.zip"
	}

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

	// Create temporary file for archive (keep extension so we pick the right extractor)
	tmpFile, err := os.CreateTemp("", tmpPattern)
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
