package assets

import (
	"embed"
)

// Embed the entire embedded directory including dotfiles
//
//go:embed embedded/opencode.json embedded/.opencode/prompts/* embedded/.opencode/tool/*
var Assets embed.FS

// GetOpencodeJSON returns the opencode.json content
func GetOpencodeJSON() ([]byte, error) {
	return Assets.ReadFile("embedded/opencode.json")
}

// GetPromptFiles returns all prompt file paths
func GetPromptFiles() ([]string, error) {
	entries, err := Assets.ReadDir("embedded/.opencode/prompts")
	if err != nil {
		return nil, err
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() {
			files = append(files, "embedded/.opencode/prompts/"+entry.Name())
		}
	}
	return files, nil
}

// GetToolFiles returns all tool file paths
func GetToolFiles() ([]string, error) {
	entries, err := Assets.ReadDir("embedded/.opencode/tool")
	if err != nil {
		return nil, err
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() {
			files = append(files, "embedded/.opencode/tool/"+entry.Name())
		}
	}
	return files, nil
}

// ReadFile reads a file from the embedded assets
func ReadFile(path string) ([]byte, error) {
	return Assets.ReadFile(path)
}
