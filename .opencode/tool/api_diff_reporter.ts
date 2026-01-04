import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import { checkPythonAvailability, limitOutputSize } from "./utils";

// Validate git ref/branch to prevent option injection
function isValidGitRef(ref: string): boolean {
  // Git refs can't start with - (would be interpreted as option)
  // and should follow git ref naming rules
  if (ref.startsWith('-')) {
    return false;
  }
  // Basic validation: refs should contain alphanumeric, /, _, -, ~, ^, but not control chars
  return /^[a-zA-Z0-9\/._~^-]+$/.test(ref);
}

type APISymbol = {
  name: string;
  type: "class" | "function" | "variable" | "constant";
  signature?: string;
  module: string;
  line: number;
};

type APIDiff = {
  added: APISymbol[];
  removed: APISymbol[];
  modified: APISymbol[];
  unchanged: APISymbol[];
};

type DiffReport = {
  ok: boolean;
  before_ref: string;
  after_ref: string;
  breaking_changes: boolean;
  summary: {
    added_count: number;
    removed_count: number;
    modified_count: number;
    unchanged_count: number;
  };
  diff: APIDiff;
  report_text: string;
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

async function extractAPIFromRef(
  ref: string,
  filePath: string,
  timeoutMs: number,
): Promise<APISymbol[]> {
  // Validate file path is repo-relative and doesn't escape
  const cwd = process.cwd();
  const resolvedPath = path.resolve(cwd, filePath);
  
  // Ensure the path is within the repository and is a Python file
  if (!resolvedPath.startsWith(cwd + path.sep) && resolvedPath !== cwd) {
    throw new Error(`Invalid file path: ${filePath} is outside repository`);
  }
  
  if (!filePath.endsWith('.py')) {
    throw new Error(`Invalid file path: ${filePath} must be a Python file`);
  }

  // Validate ref to prevent option injection
  if (!isValidGitRef(ref)) {
    throw new Error(`Invalid git reference: ${ref}`);
  }

  // Check Python availability before proceeding
  const pythonCheck = await checkPythonAvailability();
  if (!pythonCheck.available) {
    throw new Error(pythonCheck.error || 'Python 3 is not available');
  }

  // Use git show to read file content without checking out
  // Use -- separator to prevent ref from being interpreted as option
  const gitShowResult = await runCommand(
    ["git", "show", "--", `${ref}:${filePath}`],
    timeoutMs,
  );

  if (gitShowResult.exitCode !== 0) {
    return []; // File doesn't exist at this ref
  }

  const fileContent = gitShowResult.stdout;

  // Use external Python script for API extraction
  const scriptPath = path.join(__dirname, 'extract_api.py');
  
  // Check if the Python script exists
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`API extraction script not found: ${scriptPath}`);
  }

  // Pass file content via stdin to Python script
  const proc = spawn("python3", [scriptPath, filePath], {
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

  // Write file content to stdin
  proc.stdin.write(fileContent);
  proc.stdin.end();

  await new Promise<void>((resolve) => {
    proc.on("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  if (timedOut || !stdout) {
    return [];
  }

  try {
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}

function compareAPIs(before: APISymbol[], after: APISymbol[]): APIDiff {
  // Key by (module, name) to avoid collisions across modules
  const beforeMap = new Map(before.map((s) => [`${s.module}::${s.name}`, s]));
  const afterMap = new Map(after.map((s) => [`${s.module}::${s.name}`, s]));

  const added: APISymbol[] = [];
  const removed: APISymbol[] = [];
  const modified: APISymbol[] = [];
  const unchanged: APISymbol[] = [];

  // Find added and modified
  for (const [key, symbol] of afterMap) {
    if (!beforeMap.has(key)) {
      added.push(symbol);
    } else {
      const beforeSymbol = beforeMap.get(key)!;
      if (beforeSymbol.signature !== symbol.signature) {
        modified.push(symbol);
      } else {
        unchanged.push(symbol);
      }
    }
  }

  // Find removed
  for (const [key, symbol] of beforeMap) {
    if (!afterMap.has(key)) {
      removed.push(symbol);
    }
  }

  return { added, removed, modified, unchanged };
}

function generateDiffReport(
  beforeRef: string,
  afterRef: string,
  diff: APIDiff,
): string {
  const lines: string[] = [];

  lines.push(`# API Diff Report`);
  lines.push(``);
  lines.push(`**Before:** ${beforeRef}`);
  lines.push(`**After:** ${afterRef}`);
  lines.push(``);

  if (diff.removed.length > 0) {
    lines.push(`## ❌ Removed (Breaking Changes)`);
    lines.push(``);
    for (const symbol of diff.removed) {
      lines.push(`- **${symbol.name}** (${symbol.type})`);
      if (symbol.signature) lines.push(`  \`${symbol.signature}\``);
    }
    lines.push(``);
  }

  if (diff.modified.length > 0) {
    lines.push(`## ⚠️ Modified (Potential Breaking Changes)`);
    lines.push(``);
    for (const symbol of diff.modified) {
      lines.push(`- **${symbol.name}** (${symbol.type})`);
      if (symbol.signature) lines.push(`  \`${symbol.signature}\``);
    }
    lines.push(``);
  }

  if (diff.added.length > 0) {
    lines.push(`## ✨ Added`);
    lines.push(``);
    for (const symbol of diff.added) {
      lines.push(`- **${symbol.name}** (${symbol.type})`);
      if (symbol.signature) lines.push(`  \`${symbol.signature}\``);
    }
    lines.push(``);
  }

  if (diff.unchanged.length > 0) {
    lines.push(`## ✅ Unchanged (${diff.unchanged.length} symbols)`);
    lines.push(``);
  }

  const report = lines.join("\n");
  const { output } = limitOutputSize(report);
  return output;
}

export default tool({
  description:
    "Compare public API surface before and after changes to detect breaking changes. Required for semantic versioning decisions.",
  args: {
    file_path: tool.schema
      .string()
      .describe("Python module file to analyze for API changes"),

    before_ref: tool.schema
      .string()
      .optional()
      .describe("Git reference for 'before' state (default: HEAD~1)"),

    after_ref: tool.schema
      .string()
      .optional()
      .describe("Git reference for 'after' state (default: HEAD)"),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 30000)"),
  },

  async execute(args) {
    const filePath = args.file_path;
    const beforeRef = args.before_ref ?? "HEAD~1";
    const afterRef = args.after_ref ?? "HEAD";
    const timeoutMs = args.timeout_ms ?? 30_000;

    try {
      const beforeAPI = await extractAPIFromRef(beforeRef, filePath, timeoutMs);
      const afterAPI = await extractAPIFromRef(afterRef, filePath, timeoutMs);

      const diff = compareAPIs(beforeAPI, afterAPI);

      const breakingChanges = diff.removed.length > 0 ||
        diff.modified.length > 0;

      const reportText = generateDiffReport(beforeRef, afterRef, diff);

      return {
        ok: true,
        before_ref: beforeRef,
        after_ref: afterRef,
        breaking_changes: breakingChanges,
        summary: {
          added_count: diff.added.length,
          removed_count: diff.removed.length,
          modified_count: diff.modified.length,
          unchanged_count: diff.unchanged.length,
        },
        diff,
        report_text: reportText,
      } as DiffReport;
    } catch (err: unknown) {
      return {
        ok: false,
        before_ref: beforeRef,
        after_ref: afterRef,
        breaking_changes: false,
        summary: {
          added_count: 0,
          removed_count: 0,
          modified_count: 0,
          unchanged_count: 0,
        },
        diff: { added: [], removed: [], modified: [], unchanged: [] },
        report_text: "",
        error: err instanceof Error
          ? err.message
          : "Failed to generate API diff",
      } as DiffReport;
    }
  },
});
