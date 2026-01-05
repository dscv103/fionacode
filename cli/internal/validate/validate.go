package validate

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// OpencodeConfig represents the structure of opencode.json
type OpencodeConfig struct {
	Agents     map[string]Agent     `json:"agents"`
	Tools      map[string]bool      `json:"tools"`
	MCPServers map[string]MCPServer `json:"mcpServers"`
}

type Agent struct {
	Description string                 `json:"description"`
	Type        string                 `json:"type"`
	Temperature float64                `json:"temperature"`
	Prompt      string                 `json:"prompt,omitempty"`
	Tools       interface{}            `json:"tools,omitempty"` // Can be []string or map[string]interface{}
	Permissions map[string]interface{} `json:"permissions,omitempty"`
}

type MCPServer struct {
	Command string            `json:"command,omitempty"`
	Args    []string          `json:"args,omitempty"`
	URL     string            `json:"url,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
}

// Validate checks if opencode.json exists and is valid in the target directory
func Validate(targetDir string) error {
	// Resolve target directory
	if targetDir == "" {
		var err error
		targetDir, err = os.Getwd()
		if err != nil {
			return fmt.Errorf("failed to get current directory: %w", err)
		}
	}

	// Check if opencode.json exists
	opencodeJSONPath := filepath.Join(targetDir, "opencode.json")
	if _, err := os.Stat(opencodeJSONPath); os.IsNotExist(err) {
		return fmt.Errorf("opencode.json not found in %s", targetDir)
	}

	// Read and parse opencode.json
	content, err := os.ReadFile(opencodeJSONPath)
	if err != nil {
		return fmt.Errorf("failed to read opencode.json: %w", err)
	}

	var config OpencodeConfig
	if err := json.Unmarshal(content, &config); err != nil {
		return fmt.Errorf("failed to parse opencode.json: %w", err)
	}

	// Validate structure
	if len(config.Agents) == 0 {
		return fmt.Errorf("no agents defined in opencode.json")
	}

	// Check if .opencode directory exists
	opencodeDirPath := filepath.Join(targetDir, ".opencode")
	if _, err := os.Stat(opencodeDirPath); os.IsNotExist(err) {
		return fmt.Errorf(".opencode directory not found in %s", targetDir)
	}

	// Check if prompts directory exists
	promptsDirPath := filepath.Join(opencodeDirPath, "prompts")
	if _, err := os.Stat(promptsDirPath); os.IsNotExist(err) {
		return fmt.Errorf(".opencode/prompts directory not found in %s", targetDir)
	}

	// Check if tool directory exists
	toolDirPath := filepath.Join(opencodeDirPath, "tool")
	if _, err := os.Stat(toolDirPath); os.IsNotExist(err) {
		return fmt.Errorf(".opencode/tool directory not found in %s", targetDir)
	}

	// Validate that prompt files referenced in agents exist
	for agentName, agent := range config.Agents {
		if agent.Prompt != "" {
			promptPath := filepath.Join(targetDir, agent.Prompt)
			if _, err := os.Stat(promptPath); os.IsNotExist(err) {
				return fmt.Errorf("prompt file for agent %s not found: %s", agentName, agent.Prompt)
			}
		}
	}

	return nil
}

// GetSummary returns a summary of the opencode.json configuration
func GetSummary(targetDir string) (string, error) {
	if targetDir == "" {
		var err error
		targetDir, err = os.Getwd()
		if err != nil {
			return "", fmt.Errorf("failed to get current directory: %w", err)
		}
	}

	opencodeJSONPath := filepath.Join(targetDir, "opencode.json")
	content, err := os.ReadFile(opencodeJSONPath)
	if err != nil {
		return "", fmt.Errorf("failed to read opencode.json: %w", err)
	}

	var config OpencodeConfig
	if err := json.Unmarshal(content, &config); err != nil {
		return "", fmt.Errorf("failed to parse opencode.json: %w", err)
	}

	summary := fmt.Sprintf("Configuration Summary:\n")
	summary += fmt.Sprintf("  Agents: %d\n", len(config.Agents))
	summary += fmt.Sprintf("  MCP Servers: %d\n", len(config.MCPServers))

	// Count enabled and disabled tools
	enabledTools := 0
	disabledTools := 0
	for _, enabled := range config.Tools {
		if enabled {
			enabledTools++
		} else {
			disabledTools++
		}
	}
	summary += fmt.Sprintf("  Tools (enabled/disabled): %d/%d\n", enabledTools, disabledTools)

	return summary, nil
}
