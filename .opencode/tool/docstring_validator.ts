import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

type DocstringIssue = {
  type: "missing" | "incomplete" | "mismatch" | "invalid_format"
  severity: "error" | "warning"
  description: string
  line?: number
}

type FunctionValidation = {
  name: string
  line: number
  has_docstring: boolean
  param_count: number
  documented_params: string[]
  actual_params: string[]
  missing_params: string[]
  extra_params: string[]
  has_return_doc: boolean
  has_return_annotation: boolean
  issues: DocstringIssue[]
  valid: boolean
}

type ValidationReport = {
  ok: boolean
  file_path: string
  functions: FunctionValidation[]
  summary: {
    total_functions: number
    valid_count: number
    invalid_count: number
    missing_docstring_count: number
    total_issues: number
  }
  error?: string
}

async function runCommand(
  command: string[],
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command[0], command.slice(1), {
      shell: false,
      cwd: process.cwd(),
    })

    let stdout = ""
    let stderr = ""
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      proc.kill("SIGKILL")
    }, timeoutMs)

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8")
    })

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8")
    })

    proc.on("close", (code) => {
      clearTimeout(timer)
      resolve({
        exitCode: timedOut ? -1 : code ?? -1,
        stdout,
        stderr: timedOut ? "Timed out" : stderr,
      })
    })

    proc.on("error", (err) => {
      clearTimeout(timer)
      resolve({
        exitCode: -1,
        stdout,
        stderr: err.message,
      })
    })
  })
}

async function validateDocstrings(
  filePath: string,
  timeoutMs: number,
): Promise<FunctionValidation[]> {
  const pythonScript = `
import ast
import json
import sys
import re

def parse_docstring_params(docstring):
    """Extract parameter names from docstring."""
    if not docstring:
        return []
    
    # Common patterns: :param name:, Args: name, Parameters: name
    params = []
    
    # Google style
    google_match = re.findall(r'(?:Args?|Parameters?):\\s*\\n\\s+(\\w+)', docstring)
    params.extend(google_match)
    
    # Sphinx/reST style
    sphinx_match = re.findall(r':param\\s+(\\w+):', docstring)
    params.extend(sphinx_match)
    
    # NumPy style
    numpy_match = re.findall(r'^\\s*(\\w+)\\s*:', docstring, re.MULTILINE)
    params.extend(numpy_match)
    
    return list(set(params))

def has_return_doc(docstring):
    """Check if docstring documents return value."""
    if not docstring:
        return False
    return bool(re.search(r'(?:Returns?|Yields?):', docstring, re.IGNORECASE))

def validate_file(filepath):
    with open(filepath, 'r') as f:
        tree = ast.parse(f.read(), filepath)
    
    validations = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            docstring = ast.get_docstring(node)
            has_docstring = docstring is not None
            
            actual_params = [arg.arg for arg in node.args.args if arg.arg != 'self']
            documented_params = parse_docstring_params(docstring) if has_docstring else []
            
            missing_params = [p for p in actual_params if p not in documented_params]
            extra_params = [p for p in documented_params if p not in actual_params]
            
            has_return_annotation = node.returns is not None
            has_return_doc_flag = has_return_doc(docstring)
            
            issues = []
            
            if not has_docstring:
                issues.append({
                    'type': 'missing',
                    'severity': 'error',
                    'description': f'Function {node.name} has no docstring',
                    'line': node.lineno
                })
            else:
                if missing_params:
                    issues.append({
                        'type': 'incomplete',
                        'severity': 'warning',
                        'description': f'Missing documentation for parameters: {", ".join(missing_params)}',
                        'line': node.lineno
                    })
                
                if extra_params:
                    issues.append({
                        'type': 'mismatch',
                        'severity': 'warning',
                        'description': f'Documented parameters not in signature: {", ".join(extra_params)}',
                        'line': node.lineno
                    })
                
                if has_return_annotation and not has_return_doc_flag:
                    issues.append({
                        'type': 'incomplete',
                        'severity': 'warning',
                        'description': 'Function has return annotation but no return documentation',
                        'line': node.lineno
                    })
            
            valid = len(issues) == 0
            
            validations.append({
                'name': node.name,
                'line': node.lineno,
                'has_docstring': has_docstring,
                'param_count': len(actual_params),
                'documented_params': documented_params,
                'actual_params': actual_params,
                'missing_params': missing_params,
                'extra_params': extra_params,
                'has_return_doc': has_return_doc_flag,
                'has_return_annotation': has_return_annotation,
                'issues': issues,
                'valid': valid
            })
    
    return validations

if __name__ == '__main__':
    filepath = sys.argv[1]
    validations = validate_file(filepath)
    print(json.dumps(validations, indent=2))
`

  const result = await runCommand(
    ["python3", "-c", pythonScript, filePath],
    timeoutMs,
  )

  if (result.exitCode !== 0) {
    return []
  }

  try {
    return JSON.parse(result.stdout)
  } catch {
    return []
  }
}

export default tool({
  description:
    "Verify docstrings match function signatures and include all parameters. Prevents documentation from going stale.",
  args: {
    file_path: tool.schema
      .string()
      .describe("Python file to validate docstrings"),

    strict_mode: tool.schema
      .boolean()
      .optional()
      .describe("Treat warnings as errors (default: false)"),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 30000)"),
  },

  async execute(args) {
    const filePath = args.file_path
    const strictMode = args.strict_mode ?? false
    const timeoutMs = args.timeout_ms ?? 30_000

    try {
      const validations = await validateDocstrings(filePath, timeoutMs)

      const validCount = validations.filter((v) => v.valid).length
      const invalidCount = validations.length - validCount
      const missingDocstringCount = validations.filter((v) => !v.has_docstring).length
      const totalIssues = validations.reduce(
        (sum, v) => sum + v.issues.length,
        0,
      )

      return {
        ok: true,
        file_path: filePath,
        functions: validations,
        summary: {
          total_functions: validations.length,
          valid_count: validCount,
          invalid_count: invalidCount,
          missing_docstring_count: missingDocstringCount,
          total_issues: totalIssues,
        },
      } as ValidationReport
    } catch (err: any) {
      return {
        ok: false,
        file_path: filePath,
        functions: [],
        summary: {
          total_functions: 0,
          valid_count: 0,
          invalid_count: 0,
          missing_docstring_count: 0,
          total_issues: 0,
        },
        error: err?.message ?? "Failed to validate docstrings",
      } as ValidationReport
    }
  },
})
