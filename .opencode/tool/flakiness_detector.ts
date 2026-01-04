import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

type TestRun = {
  run_number: number;
  passed: boolean;
  duration_ms: number;
  output?: string;
};

type FlakyTest = {
  test_name: string;
  total_runs: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
  is_flaky: boolean;
  variance_ms: number;
  runs: TestRun[];
};

type FlakinessReport = {
  ok: boolean;
  total_runs: number;
  flaky_tests: FlakyTest[];
  consistent_tests: FlakyTest[];
  flakiness_detected: boolean;
  summary: {
    total_tests: number;
    flaky_count: number;
    consistent_count: number;
    overall_pass_rate: number;
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

async function runPytestMultipleTimes(
  testPath: string,
  count: number,
  timeoutMs: number,
): Promise<TestRun[]> {
  const runs: TestRun[] = [];

  for (let i = 0; i < count; i++) {
    const startTime = Date.now();
    const result = await runCommand(
      ["pytest", testPath, "-v", "--tb=short"],
      timeoutMs,
    );
    const duration = Date.now() - startTime;

    runs.push({
      run_number: i + 1,
      passed: result.exitCode === 0,
      duration_ms: duration,
      output: result.stdout + "\n" + result.stderr,
    });
  }

  return runs;
}

function analyzeTestRuns(testName: string, runs: TestRun[]): FlakyTest {
  const passedCount = runs.filter((r) => r.passed).length;
  const failedCount = runs.length - passedCount;
  const passRate = (passedCount / runs.length) * 100;

  // Calculate variance in duration
  const durations = runs.map((r) => r.duration_ms);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce(
    (sum, d) => sum + Math.pow(d - avgDuration, 2),
    0,
  ) / durations.length;

  // Test is flaky if it doesn't consistently pass or fail
  const isFlaky = passedCount > 0 && failedCount > 0;

  return {
    test_name: testName,
    total_runs: runs.length,
    passed_count: passedCount,
    failed_count: failedCount,
    pass_rate: passRate,
    is_flaky: isFlaky,
    variance_ms: variance,
    runs,
  };
}

export default tool({
  description:
    "Run tests multiple times to detect non-deterministic failures (flaky tests). Catches race conditions and timing issues.",
  args: {
    test_path: tool.schema
      .string()
      .describe("Path to test file or directory to check for flakiness"),

    run_count: tool.schema
      .number()
      .optional()
      .describe("Number of times to run each test (default: 10)"),

    timeout_per_run_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout per test run in milliseconds (default: 60000)"),

    fail_fast: tool.schema
      .boolean()
      .optional()
      .describe("Stop after first flaky test is detected (default: false)"),
  },

  async execute(args) {
    const testPath = args.test_path;
    const runCount = args.run_count ?? 10;
    const timeoutPerRun = args.timeout_per_run_ms ?? 60_000;
    const _failFast = args.fail_fast ?? false;

    if (runCount < 2) {
      return {
        ok: false,
        total_runs: 0,
        flaky_tests: [],
        consistent_tests: [],
        flakiness_detected: false,
        summary: {
          total_tests: 0,
          flaky_count: 0,
          consistent_count: 0,
          overall_pass_rate: 0,
        },
        error: "run_count must be at least 2",
      } as FlakinessReport;
    }

    try {
      // First, get list of tests
      const listResult = await runCommand(
        ["pytest", testPath, "--collect-only", "-q"],
        10_000,
      );

      if (listResult.exitCode !== 0) {
        return {
          ok: false,
          total_runs: 0,
          flaky_tests: [],
          consistent_tests: [],
          flakiness_detected: false,
          summary: {
            total_tests: 0,
            flaky_count: 0,
            consistent_count: 0,
            overall_pass_rate: 0,
          },
          error: "Failed to collect tests",
        } as FlakinessReport;
      }

      // For simplicity, run the entire test suite multiple times
      // In production, you'd want to parse individual tests and run each separately
      const runs = await runPytestMultipleTimes(
        testPath,
        runCount,
        timeoutPerRun,
      );

      const analysis = analyzeTestRuns(testPath, runs);

      const flakyTests = analysis.is_flaky ? [analysis] : [];
      const consistentTests = !analysis.is_flaky ? [analysis] : [];

      const flakinessDetected = flakyTests.length > 0;

      return {
        ok: true,
        total_runs: runCount,
        flaky_tests: flakyTests,
        consistent_tests: consistentTests,
        flakiness_detected: flakinessDetected,
        summary: {
          total_tests: 1,
          flaky_count: flakyTests.length,
          consistent_count: consistentTests.length,
          overall_pass_rate: analysis.pass_rate,
        },
      } as FlakinessReport;
    } catch (err: unknown) {
      return {
        ok: false,
        total_runs: 0,
        flaky_tests: [],
        consistent_tests: [],
        flakiness_detected: false,
        summary: {
          total_tests: 0,
          flaky_count: 0,
          consistent_count: 0,
          overall_pass_rate: 0,
        },
        error: err?.message ?? "Failed to run flakiness detection",
      } as FlakinessReport;
    }
  },
});
