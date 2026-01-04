/**
 * Shared utility functions for tool implementations
 */

import { spawn } from 'child_process';

/**
 * Maximum output size in bytes (10MB default)
 */
export const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

/**
 * Exit code constants for command execution
 */
const TIMEOUT_EXIT_CODE = -1;
const ERROR_EXIT_CODE = -1;

/**
 * Allowlist of known safe commands that tools may check for
 * This list can be extended as needed for new tools
 */
const ALLOWED_COMMANDS = [
  'python3',
  'pytest',
  'radon',
  'pip-audit',
  'mypy',
  'pyright',
  'coverage',
  'which',
  'pip',
  'git',
  'node',
  'npm',
  'tsc',
  'eslint',
] as const;

/**
 * Validates a command name against security rules
 * @param command - Command name to validate
 * @returns True if valid, false otherwise
 */
function isValidCommandName(command: string): boolean {
  // Must be alphanumeric with hyphens, underscores, or dots
  // No path separators, no special shell characters
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  
  if (!validPattern.test(command)) {
    return false;
  }
  
  // Check against allowlist
  return (ALLOWED_COMMANDS as readonly string[]).includes(command);
}

/**
 * Validates a Python package name against Python identifier rules
 * Allows dots for module paths (e.g., 'package.submodule')
 * @param packageName - Package name to validate
 * @returns True if valid, false otherwise
 */
function isValidPythonPackageName(packageName: string): boolean {
  // Python identifier rules: ^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
  return validPattern.test(packageName);
}

/**
 * Shared command runner with security controls
 * Executes commands without shell interpolation
 * @param command - Command to run (first element of args array)
 * @param args - Arguments for the command
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise with exit code, stdout, and stderr
 */
export function runCommand(
  command: string,
  args: string[],
  timeoutMs: number = 5000
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout?.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr?.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: timedOut ? TIMEOUT_EXIT_CODE : code ?? ERROR_EXIT_CODE,
        stdout,
        stderr: timedOut ? 'Command timed out' : stderr,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: ERROR_EXIT_CODE,
        stdout,
        stderr: err.message,
      });
    });
  });
}

/**
 * Check if Python 3 is available
 * @returns {Promise<{available: boolean, version?: string, error?: string}>}
 */
export async function checkPythonAvailability(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const result = await runCommand('python3', ['--version'], 5000);
    if (result.exitCode === 0) {
      const version = result.stdout.trim() || result.stderr.trim();
      return { available: true, version };
    }
    return {
      available: false,
      error: 'Python 3 is not available. Please install Python 3.8 or higher.',
    };
  } catch (error) {
    return {
      available: false,
      error: 'Python 3 is not available. Please install Python 3.8 or higher.',
    };
  }
}

/**
 * Check if a Python package is installed
 * @param packageName - Name of the Python package to check
 * @returns {Promise<{installed: boolean, version?: string, error?: string}>}
 */
export async function checkPythonPackage(
  packageName: string
): Promise<{
  installed: boolean;
  version?: string;
  error?: string;
}> {
  // Validate package name to prevent injection attacks
  if (!isValidPythonPackageName(packageName)) {
    return {
      installed: false,
      error: `Invalid Python package name: '${packageName}'. Package names must follow Python identifier rules.`,
    };
  }

  try {
    // Use explicit arguments instead of shell interpolation
    // SECURITY NOTE: While this constructs a Python string with the package name, it's safe because:
    // 1. We've validated packageName against Python identifier rules (only letters, numbers, underscores, dots)
    // 2. The validation prevents any shell metacharacters or code injection attempts
    // 3. This is the standard approach for checking Python package availability
    // 4. Alternative approaches (like using pip show) would be less reliable for checking if a package is importable
    const pythonCode = `import ${packageName}; print(${packageName}.__version__ if hasattr(${packageName}, '__version__') else 'installed')`;
    const result = await runCommand('python3', ['-c', pythonCode], 5000);
    
    if (result.exitCode === 0) {
      return { installed: true, version: result.stdout.trim() };
    }
    return {
      installed: false,
      error: `Python package '${packageName}' is not installed. Install it with: pip install ${packageName}`,
    };
  } catch (error) {
    return {
      installed: false,
      error: `Python package '${packageName}' is not installed. Install it with: pip install ${packageName}`,
    };
  }
}

/**
 * Check if a command-line tool is available
 * @param command - Command to check (e.g., 'radon', 'pytest')
 * @returns {Promise<{available: boolean, version?: string, error?: string}>}
 */
export async function checkCommandAvailability(
  command: string
): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  // Validate command name to prevent injection attacks
  if (!isValidCommandName(command)) {
    return {
      available: false,
      error: `Invalid or disallowed command name: '${command}'. Command must be alphanumeric with hyphens/underscores/dots and be in the allowlist.`,
    };
  }

  try {
    // Use 'which' command with explicit arguments (no shell interpolation)
    const whichResult = await runCommand('which', [command], 5000);
    
    if (whichResult.exitCode === 0 && whichResult.stdout.trim()) {
      // Try to get version
      try {
        const versionResult = await runCommand(command, ['--version'], 5000);
        const versionOutput = versionResult.stdout.trim() || versionResult.stderr.trim();
        return { available: true, version: versionOutput };
      } catch {
        return { available: true };
      }
    }
    return {
      available: false,
      error: `Command '${command}' is not available. Please install it.`,
    };
  } catch (error) {
    return {
      available: false,
      error: `Command '${command}' is not available. Please install it.`,
    };
  }
}

/**
 * Limit the size of output to prevent memory issues
 * @param output - The output string to limit
 * @param maxSize - Maximum size in bytes (default: MAX_OUTPUT_SIZE)
 * @returns The limited output with a warning if truncated
 */
export function limitOutputSize(
  output: string,
  maxSize: number = MAX_OUTPUT_SIZE
): { output: string; truncated: boolean } {
  const sizeInBytes = Buffer.byteLength(output, 'utf8');
  
  if (sizeInBytes <= maxSize) {
    return { output, truncated: false };
  }

  // Calculate how much to keep (leave room for warning message)
  const warningMessage = `\n\n... [Output truncated: ${sizeInBytes} bytes > ${maxSize} bytes limit] ...`;
  const keepSize = maxSize - Buffer.byteLength(warningMessage, 'utf8');
  
  // Truncate to byte boundary
  let truncated = output;
  while (Buffer.byteLength(truncated, 'utf8') > keepSize) {
    truncated = truncated.slice(0, truncated.length - 1);
  }
  
  return {
    output: truncated + warningMessage,
    truncated: true,
  };
}

/**
 * Validate JSON state structure
 * @param state - The state object to validate
 * @param requiredFields - Array of required field names
 * @returns {boolean} True if valid, false otherwise
 */
export function validateStateStructure(
  state: any,
  requiredFields: string[]
): boolean {
  if (!state || typeof state !== 'object') {
    return false;
  }

  for (const field of requiredFields) {
    if (!(field in state)) {
      return false;
    }
  }

  return true;
}

/**
 * Parse conventional commit message
 * @param message - Commit message to parse
 * @returns Parsed commit information
 */
export function parseConventionalCommit(message: string): {
  type: string;
  scope?: string;
  breaking: boolean;
  description: string;
  body?: string;
  footer?: string;
} {
  const lines = message.split('\n');
  const firstLine = lines[0];
  
  // Match: type(scope)!: description or type!: description or type(scope): description or type: description
  const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
  const match = firstLine.match(conventionalRegex);
  
  if (!match) {
    return {
      type: 'unknown',
      breaking: false,
      description: firstLine,
    };
  }

  const [, type, scope, breakingMarker, description] = match;
  
  // Extract body and footer
  let body: string | undefined;
  let footer: string | undefined;
  
  if (lines.length > 2) {
    const bodyLines: string[] = [];
    const footerLines: string[] = [];
    let inFooter = false;
    
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      // Footer starts with "BREAKING CHANGE:" or "token: value" format
      if (
        line.match(/^BREAKING[- ]CHANGE:\s/) ||
        line.match(/^[\w-]+:\s/)
      ) {
        inFooter = true;
      }
      
      if (inFooter) {
        footerLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }
    
    if (bodyLines.length > 0) {
      body = bodyLines.join('\n').trim();
    }
    if (footerLines.length > 0) {
      footer = footerLines.join('\n').trim();
    }
  }
  
  // Check for breaking changes
  const breaking = 
    breakingMarker === '!' ||
    (footer?.includes('BREAKING CHANGE:') || footer?.includes('BREAKING-CHANGE:')) ||
    false;

  return {
    type,
    scope,
    breaking,
    description,
    body,
    footer,
  };
}
