import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";
import { checkCommandAvailability, limitOutputSize } from "./utils";

type FunctionComplexity = {
  name: string;
  line: number;
  complexity: number;
  rank: "A" | "B" | "C" | "D" | "F";
};

type FileComplexity = {
  path: string;
  average_complexity: number;
  total_complexity: number;
  functions: FunctionComplexity[];
  maintainability_index?: number;
  rank: "A" | "B" | "C" | "D" | "F";
};

type ComplexityReport = {
  ok: boolean;
  files: FileComplexity[];
  summary: {
    total_files: number;
    total_functions: number;
    average_complexity: number;
    high_complexity_count: number;
    refactoring_targets: FileComplexity[];
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

function rankComplexity(complexity: number): "A" | "B" | "C" | "D" | "F" {
  if (complexity <= 5) return "A";
  if (complexity <= 10) return "B";
  if (complexity <= 20) return "C";
  if (complexity <= 30) return "D";
  return "F";
}

async function analyzeWithRadon(
  paths: string[],
  timeoutMs: number,
): Promise<FileComplexity[]> {
  // Check if radon is available before attempting to use it
  const radonCheck = await checkCommandAvailability('radon');
  if (!radonCheck.available) {
    throw new Error(
      radonCheck.error || 
      'radon is not installed. Install it with: pip install radon'
    );
  }

  const args = ["cc", "--json", ...paths];
  const result = await runCommand(["radon", ...args], timeoutMs);

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    const files: FileComplexity[] = [];

    for (const [filePath, functions] of Object.entries(data)) {
      if (!Array.isArray(functions) || functions.length === 0) continue;

      const funcComplexities: FunctionComplexity[] = functions.map((
        fn: Record<string, unknown>,
      ) => ({
        name: fn.name || "unknown",
        line: fn.lineno || 0,
        complexity: fn.complexity || 0,
        rank: fn.rank || rankComplexity(fn.complexity || 0),
      }));

      const totalComplexity = funcComplexities.reduce(
        (sum, fn) => sum + fn.complexity,
        0,
      );
      const avgComplexity = funcComplexities.length > 0
        ? totalComplexity / funcComplexities.length
        : 0;

      files.push({
        path: filePath,
        average_complexity: avgComplexity,
        total_complexity: totalComplexity,
        functions: funcComplexities.sort((a, b) => b.complexity - a.complexity),
        rank: rankComplexity(avgComplexity),
      });
    }

    return files;
  } catch {
    return [];
  }
}

async function getMaintainabilityIndex(
  paths: string[],
  timeoutMs: number,
): Promise<Map<string, number>> {
  const args = ["mi", "--json", ...paths];
  const result = await runCommand(["radon", ...args], timeoutMs);

  const miMap = new Map<string, number>();

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return miMap;
  }

  try {
    const data = JSON.parse(result.stdout);
    for (const [filePath, value] of Object.entries(data)) {
      if (typeof value === "number") {
        miMap.set(filePath, value);
      } else if (typeof value === "object" && value !== null && "mi" in value) {
        miMap.set(filePath, (value as Record<string, number>).mi);
      }
    }
  } catch {
    // Failed to parse
  }

  return miMap;
}

export default tool({
  description:
    "Calculate cyclomatic complexity, cognitive complexity, and maintainability index for Python code using radon. Identifies refactoring targets objectively.",
  args: {
    paths: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Python files or directories to analyze (default: current directory)",
      ),

    include_maintainability: tool.schema
      .boolean()
      .optional()
      .describe("Include maintainability index calculation (default: true)"),

    complexity_threshold: tool.schema
      .number()
      .optional()
      .describe(
        "Complexity threshold for flagging high complexity (default: 10)",
      ),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 60000)"),
  },

  async execute(args) {
    const paths = args.paths ?? ["."];
    const includeMI = args.include_maintainability ?? true;
    const threshold = args.complexity_threshold ?? 10;
    const timeoutMs = args.timeout_ms ?? 60_000;

    // Check if radon is installed
    const checkResult = await runCommand(["radon", "--version"], 5000);
    if (checkResult.exitCode !== 0) {
      return {
        ok: false,
        files: [],
        summary: {
          total_files: 0,
          total_functions: 0,
          average_complexity: 0,
          high_complexity_count: 0,
          refactoring_targets: [],
        },
        error: "radon is not installed. Install with: pip install radon",
      } as ComplexityReport;
    }

    const files = await analyzeWithRadon(paths, timeoutMs);

    if (files.length === 0) {
      return {
        ok: true,
        files: [],
        summary: {
          total_files: 0,
          total_functions: 0,
          average_complexity: 0,
          high_complexity_count: 0,
          refactoring_targets: [],
        },
      } as ComplexityReport;
    }

    // Get maintainability index if requested
    if (includeMI) {
      const miMap = await getMaintainabilityIndex(paths, timeoutMs);
      for (const file of files) {
        if (miMap.has(file.path)) {
          file.maintainability_index = miMap.get(file.path);
        }
      }
    }

    // Calculate summary statistics
    const totalFunctions = files.reduce(
      (sum, file) => sum + file.functions.length,
      0,
    );
    const totalComplexity = files.reduce(
      (sum, file) => sum + file.total_complexity,
      0,
    );
    const avgComplexity = totalFunctions > 0
      ? totalComplexity / totalFunctions
      : 0;

    const highComplexityCount = files.reduce(
      (sum, file) =>
        sum + file.functions.filter((fn) => fn.complexity > threshold).length,
      0,
    );

    // Identify refactoring targets (files with high average complexity or low MI)
    const refactoringTargets = files
      .filter(
        (file) =>
          file.average_complexity > threshold ||
          (file.maintainability_index !== undefined &&
            file.maintainability_index < 65),
      )
      .sort((a, b) => b.average_complexity - a.average_complexity)
      .slice(0, 10); // Top 10

    return {
      ok: true,
      files: files.sort((a, b) => b.average_complexity - a.average_complexity),
      summary: {
        total_files: files.length,
        total_functions: totalFunctions,
        average_complexity: avgComplexity,
        high_complexity_count: highComplexityCount,
        refactoring_targets: refactoringTargets,
      },
    } as ComplexityReport;
  },
});
