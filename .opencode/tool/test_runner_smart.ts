import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"

type TestResult = {
  file: string
  passed: boolean
  duration_ms: number
  failures?: string[]
  errors?: string[]
}

type SmartTestReport = {
  ok: boolean
  mode: "all" | "affected" | "specific"
  changed_files: string[]
  affected_test_files: string[]
  total_tests: number
  passed_tests: number
  failed_tests: number
  skipped_tests: number
  duration_ms: number
  all_passed: boolean
  results: TestResult[]
  error?: string
  pytest_output?: string
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

async function getChangedFiles(): Promise<string[]> {
  const result = await runCommand(
    ["git", "diff", "--name-only", "HEAD"],
    10_000,
  )

  if (result.exitCode !== 0) {
    return []
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.endsWith(".py"))
}

async function findTestFiles(changedFiles: string[]): Promise<string[]> {
  const testFiles = new Set<string>()

  // Direct test file changes
  for (const file of changedFiles) {
    if (file.includes("test_") || file.includes("_test.py")) {
      testFiles.add(file)
    }
  }

  // Find corresponding test files for changed source files
  for (const file of changedFiles) {
    if (testFiles.has(file)) continue

    const dir = path.dirname(file)
    const basename = path.basename(file, ".py")

    // Common test patterns
    const patterns = [
      path.join(dir, `test_${basename}.py`),
      path.join(dir, `${basename}_test.py`),
      path.join("tests", dir, `test_${basename}.py`),
      path.join("test", dir, `test_${basename}.py`),
      path.join(dir, "tests", `test_${basename}.py`),
    ]

    for (const pattern of patterns) {
      try {
        // Check if file exists by trying to read it
        const result = await runCommand(["test", "-f", pattern], 1000)
        if (result.exitCode === 0) {
          testFiles.add(pattern)
        }
      } catch {
        // File doesn't exist, continue
      }
    }
  }

  return Array.from(testFiles)
}

async function runPytest(
  testFiles: string[],
  extraArgs: string[],
  timeoutMs: number,
): Promise<SmartTestReport> {
  const args = [...extraArgs, ...testFiles]
  const result = await runCommand(["pytest", ...args, "--tb=short", "-v"], timeoutMs)

  const report: SmartTestReport = {
    ok: true,
    mode: testFiles.length > 0 ? "affected" : "all",
    changed_files: [],
    affected_test_files: testFiles,
    total_tests: 0,
    passed_tests: 0,
    failed_tests: 0,
    skipped_tests: 0,
    duration_ms: 0,
    all_passed: result.exitCode === 0,
    results: [],
    pytest_output: result.stdout + "\n" + result.stderr,
  }

  // Parse pytest output for summary
  const output = result.stdout + result.stderr
  const summaryMatch = output.match(
    /(\d+) passed(?:, (\d+) failed)?(?:, (\d+) skipped)?/,
  )

  if (summaryMatch) {
    report.passed_tests = parseInt(summaryMatch[1] || "0", 10)
    report.failed_tests = parseInt(summaryMatch[2] || "0", 10)
    report.skipped_tests = parseInt(summaryMatch[3] || "0", 10)
    report.total_tests =
      report.passed_tests + report.failed_tests + report.skipped_tests
  }

  // Parse duration
  const durationMatch = output.match(/in ([\d.]+)s/)
  if (durationMatch) {
    report.duration_ms = Math.round(parseFloat(durationMatch[1]) * 1000)
  }

  // Parse individual test results (basic)
  const testLines = output.split("\n").filter((line) => line.includes("PASSED") || line.includes("FAILED"))
  
  for (const line of testLines) {
    const match = line.match(/^([^\s]+)\s+(PASSED|FAILED)/)
    if (match) {
      const [, testPath, status] = match
      const file = testPath.split("::")[0]
      
      report.results.push({
        file,
        passed: status === "PASSED",
        duration_ms: 0,
        failures: status === "FAILED" ? [line] : undefined,
      })
    }
  }

  if (result.exitCode === -1) {
    report.ok = false
    report.error = "pytest execution timed out or failed to run"
  }

  return report
}

export default tool({
  description:
    "Run only tests affected by changed files (delta testing) or specific test files. Analyzes git diff to identify relevant tests.",
  args: {
    mode: tool.schema
      .enum(["auto", "all", "affected", "specific"])
      .optional()
      .describe(
        "Test mode: 'auto' (default, detects changes), 'all' (run all tests), 'affected' (only changed), 'specific' (provided files)",
      ),

    test_files: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Specific test files to run (for mode='specific')"),

    pytest_args: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Additional pytest arguments (e.g., ['-k', 'test_foo', '--maxfail=1'])"),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds for pytest execution (default: 300000)"),
  },

  async execute(args) {
    const mode = args.mode ?? "auto"
    const timeoutMs = args.timeout_ms ?? 300_000
    const pytestArgs = args.pytest_args ?? []

    if (mode === "all") {
      // Run all tests
      return await runPytest([], pytestArgs, timeoutMs)
    }

    if (mode === "specific") {
      if (!args.test_files || args.test_files.length === 0) {
        return {
          ok: false,
          mode: "specific",
          changed_files: [],
          affected_test_files: [],
          total_tests: 0,
          passed_tests: 0,
          failed_tests: 0,
          skipped_tests: 0,
          duration_ms: 0,
          all_passed: false,
          results: [],
          error: "mode='specific' requires test_files parameter",
        } as SmartTestReport
      }
      const report = await runPytest(args.test_files, pytestArgs, timeoutMs)
      report.mode = "specific"
      return report
    }

    // mode === "auto" or "affected"
    const changedFiles = await getChangedFiles()

    if (changedFiles.length === 0) {
      // No changes, run all tests or skip
      const report = await runPytest([], pytestArgs, timeoutMs)
      report.mode = "all"
      report.changed_files = []
      return report
    }

    const affectedTests = await findTestFiles(changedFiles)

    if (affectedTests.length === 0) {
      // No affected tests found, optionally run all tests
      return {
        ok: true,
        mode: "affected",
        changed_files: changedFiles,
        affected_test_files: [],
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
        skipped_tests: 0,
        duration_ms: 0,
        all_passed: true,
        results: [],
        error: "No affected test files found for changed files",
      } as SmartTestReport
    }

    const report = await runPytest(affectedTests, pytestArgs, timeoutMs)
    report.changed_files = changedFiles
    return report
  },
})
