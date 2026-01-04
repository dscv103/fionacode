/**
 * Shared utility functions for tool implementations
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Maximum output size in bytes (10MB default)
 */
export const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

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
    const { stdout } = await execAsync('python3 --version', {
      timeout: 5000,
    });
    const version = stdout.trim();
    return { available: true, version };
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
  try {
    const { stdout } = await execAsync(
      `python3 -c "import ${packageName}; print(${packageName}.__version__ if hasattr(${packageName}, '__version__') else 'installed')"`,
      { timeout: 5000 }
    );
    return { installed: true, version: stdout.trim() };
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
  try {
    const { stdout } = await execAsync(`which ${command}`, {
      timeout: 5000,
    });
    if (stdout.trim()) {
      // Try to get version
      try {
        const { stdout: versionOutput } = await execAsync(
          `${command} --version`,
          { timeout: 5000 }
        );
        return { available: true, version: versionOutput.trim() };
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
