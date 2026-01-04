import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { checkCommandAvailability, checkPythonPackage, limitOutputSize } from "./utils";

type Severity = "critical" | "warning" | "info";

type FileCoverage = {
  path: string;
  line_coverage: number;
  branch_coverage: number;
  missing_lines: number[];
  missing_branches: number[];
  severity: Severity;
};

type Summary = {
  total_statements: number;
  covered_statements: number;
  total_branches: number;
  covered_branches: number;
  line_coverage: number;
  branch_coverage: number;
  file_count: number;
};

type CoverageReport = {
  ok: boolean;
  summary: Summary;
  files: FileCoverage[];
  passed: boolean;
  threshold: number;
  coverage_file?: string;
  error?: string;
};

const DEFAULT_THRESHOLD = 70.0;

function classifySeverity(
  lineCoverage: number,
  branchCoverage: number,
): Severity {
  const minCoverage = Math.min(lineCoverage, branchCoverage);
  if (minCoverage < 50) return "critical";
  if (minCoverage < 70) return "warning";
  return "info";
}

async function runPytest(
  pytestArgs: string[],
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  // Check if pytest and coverage are available
  const pytestCheck = await checkCommandAvailability('pytest');
  if (!pytestCheck.available) {
    throw new Error(
      pytestCheck.error || 
      'pytest is not installed. Install it with: pip install pytest pytest-cov'
    );
  }

  const coverageCheck = await checkPythonPackage('coverage');
  if (!coverageCheck.installed) {
    throw new Error(
      coverageCheck.error || 
      'coverage is not installed. Install it with: pip install coverage'
    );
  }

  return new Promise((resolve) => {
    const proc = spawn("pytest", pytestArgs, {
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

async function parseCoverageJSON(
  coverageFile: string,
): Promise<CoverageReport> {
  try {
    const raw = await readFile(coverageFile, "utf8");
    const data = JSON.parse(raw);

    if (!data || !data.totals || !data.files) {
      throw new Error("Invalid coverage.json structure");
    }

    const totals = data.totals;
    const summary: Summary = {
      total_statements: totals.num_statements ?? 0,
      covered_statements: totals.covered_lines ?? 0,
      total_branches: totals.num_branches ?? 0,
      covered_branches: totals.covered_branches ?? 0,
      line_coverage: totals.percent_covered ?? 0,
      branch_coverage: totals.percent_covered_display
        ? parseFloat(totals.percent_covered_display)
        : totals.percent_covered ?? 0,
      file_count: Object.keys(data.files).length,
    };

    const files: FileCoverage[] = [];
    const projectRoot = process.cwd();

    for (
      const [filePath, fileData] of Object.entries(data.files) as [
        string,
        Record<string, unknown>,
      ][]
    ) {
      const relPath = path.relative(projectRoot, filePath).replace(/\\/g, "/");

      const lineCov = fileData.summary?.percent_covered ?? 0;
      const branchCov = fileData.summary?.percent_covered_display
        ? parseFloat(fileData.summary.percent_covered_display)
        : lineCov;

      const missingLines: number[] = [];
      const missingBranches: number[] = [];

      if (fileData.missing_lines && Array.isArray(fileData.missing_lines)) {
        missingLines.push(...fileData.missing_lines);
      }

      if (fileData.excluded_lines && Array.isArray(fileData.excluded_lines)) {
        // Optionally track excluded lines if needed
      }

      files.push({
        path: relPath,
        line_coverage: lineCov,
        branch_coverage: branchCov,
        missing_lines: missingLines.sort((a, b) => a - b),
        missing_branches: missingBranches,
        severity: classifySeverity(lineCov, branchCov),
      });
    }

    // Sort files by severity then coverage
    files.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const aSev = severityOrder[a.severity];
      const bSev = severityOrder[b.severity];
      if (aSev !== bSev) return aSev - bSev;
      return a.line_coverage - b.line_coverage;
    });

    const threshold = DEFAULT_THRESHOLD;
    const passed = summary.branch_coverage >= threshold;

    return {
      ok: true,
      summary,
      files,
      passed,
      threshold,
      coverage_file: coverageFile,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      summary: {
        total_statements: 0,
        covered_statements: 0,
        total_branches: 0,
        covered_branches: 0,
        line_coverage: 0,
        branch_coverage: 0,
        file_count: 0,
      },
      files: [],
      passed: false,
      threshold: DEFAULT_THRESHOLD,
      coverage_file: coverageFile,
      error: err?.message ?? "Failed to parse coverage.json",
    };
  }
}

export default tool({
  description:
    "Run pytest with coverage (or parse existing coverage.json) and produce structured metrics grouped by severity.",
  args: {
    run_pytest: tool.schema
      .boolean()
      .optional()
      .describe(
        "If true, run pytest --cov; if false, parse existing coverage.json",
      ),

    coverage_file: tool.schema
      .string()
      .optional()
      .describe("Path to coverage.json (default: coverage.json)"),

    pytest_args: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Additional pytest arguments (e.g. ['--cov=src', '--cov-report=json'])",
      ),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe(
        "Timeout in milliseconds for pytest execution (default: 300000)",
      ),

    threshold: tool.schema
      .number()
      .optional()
      .describe("Branch coverage threshold percentage (default: 70.0)"),
  },

  async execute(args) {
    const runPytestFlag = args.run_pytest ?? true;
    const coverageFile = args.coverage_file ?? "coverage.json";
    const pytestArgs = args.pytest_args ?? [
      "--cov",
      "--cov-report=json",
      "--cov-report=term",
    ];
    const timeoutMs = args.timeout_ms ?? 300_000;
    const threshold = args.threshold ?? DEFAULT_THRESHOLD;

    if (runPytestFlag) {
      // Run pytest with coverage
      const result = await runPytest(pytestArgs, timeoutMs);

      if (result.exitCode !== 0 && result.exitCode !== -1) {
        // pytest may fail tests but still generate coverage
        // Continue parsing if coverage.json exists
      }

      if (result.exitCode === -1) {
        return {
          ok: false,
          summary: {
            total_statements: 0,
            covered_statements: 0,
            total_branches: 0,
            covered_branches: 0,
            line_coverage: 0,
            branch_coverage: 0,
            file_count: 0,
          },
          files: [],
          passed: false,
          threshold,
          error: `pytest command failed: ${result.stderr}`,
        };
      }
    }

    // Parse coverage.json
    const report = await parseCoverageJSON(coverageFile);

    // Update threshold if provided
    if (args.threshold !== undefined) {
      report.threshold = threshold;
      report.passed = report.summary.branch_coverage >= threshold;
    }

    return report;
  },
});
