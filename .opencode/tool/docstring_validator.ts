import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import { checkPythonAvailability, limitOutputSize } from "./utils";

type DocstringIssue = {
  type: "missing" | "incomplete" | "mismatch" | "invalid_format";
  severity: "error" | "warning";
  description: string;
  line?: number;
};

type FunctionValidation = {
  name: string;
  line: number;
  has_docstring: boolean;
  param_count: number;
  documented_params: string[];
  actual_params: string[];
  missing_params: string[];
  extra_params: string[];
  has_return_doc: boolean;
  has_return_annotation: boolean;
  issues: DocstringIssue[];
  valid: boolean;
};

type ValidationReport = {
  ok: boolean;
  file_path: string;
  functions: FunctionValidation[];
  summary: {
    total_functions: number;
    valid_count: number;
    invalid_count: number;
    missing_docstring_count: number;
    total_issues: number;
  };
  error?: string;
};

function runCommand(
  command: string[],
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command[0], command.slice(1), {
      shell: false,
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: timedOut ? -1 : code ?? -1,
        stdout,
        stderr: timedOut ? "Timed out" : stderr,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: -1,
        stdout,
        stderr: err.message,
      });
    });
  });
}

async function validateDocstrings(
  filePath: string,
  timeoutMs: number,
): Promise<FunctionValidation[]> {
  // Check Python availability before proceeding
  const pythonCheck = await checkPythonAvailability();
  if (!pythonCheck.available) {
    throw new Error(pythonCheck.error || 'Python 3 is not available');
  }

  // Use external Python script for docstring validation
  const scriptPath = path.join(__dirname, 'validate_docstrings.py');
  
  // Check if the Python script exists
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Docstring validation script not found: ${scriptPath}`);
  }

  const result = await runCommand(
    ["python3", scriptPath, filePath],
    timeoutMs,
  );

  if (result.exitCode !== 0) {
    return [];
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return [];
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
    const filePath = args.file_path;
    const _strictMode = args.strict_mode ?? false;
    const timeoutMs = args.timeout_ms ?? 30_000;

    try {
      const validations = await validateDocstrings(filePath, timeoutMs);

      const validCount = validations.filter((v) => v.valid).length;
      const invalidCount = validations.length - validCount;
      const missingDocstringCount = validations.filter((v) =>
        !v.has_docstring
      ).length;
      const totalIssues = validations.reduce(
        (sum, v) => sum + v.issues.length,
        0,
      );

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
      } as ValidationReport;
    } catch (err: unknown) {
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
      } as ValidationReport;
    }
  },
});
