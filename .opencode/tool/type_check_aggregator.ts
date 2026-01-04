import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

// Fixed profile names to avoid arbitrary command execution
const PROFILES = ["pyright", "ty", "both"] as const;

type Profile = (typeof PROFILES)[number];
type Severity = "error" | "warning" | "info";
type Category =
  | "type"
  | "import"
  | "attribute"
  | "call"
  | "assignment"
  | "nullability"
  | "syntax"
  | "config"
  | "unknown";

type Diagnostic = {
  checker: "pyright" | "ty";
  path: string;
  line: number;
  column: number;
  severity: Severity;
  category: Category;
  code?: string;
  message: string;
};

type RunResult = {
  checker: "pyright" | "ty";
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  raw: string;
  parseError?: string;
};

type AggregateCounts = {
  error: number;
  warning: number;
  info: number;
};

const CATEGORY_BY_RULE: Record<string, Category> = {
  // Pyright
  reportGeneralTypeIssues: "type",
  reportOptionalMemberAccess: "nullability",
  reportOptionalSubscript: "nullability",
  reportOptionalCall: "nullability",
  reportMissingImports: "import",
  reportMissingModuleSource: "import",
  reportInvalidTypeForm: "type",
  reportUnknownLambdaType: "type",
  reportUntypedFunctionDecorator: "type",
  reportCallIssue: "call",
  reportArgumentType: "call",
  reportAssignmentType: "assignment",
  reportAttributeAccessIssue: "attribute",
  reportMissingTypeStubs: "config",
  reportMissingTypeArgument: "type",
  // Ty (adjust as codes become known)
};

function normalizeSeverity(value: string | undefined): Severity {
  const v = (value ?? "").toLowerCase();
  if (v === "warning" || v === "warn") return "warning";
  if (v === "info" || v === "information" || v === "hint") return "info";
  return "error";
}

function mapCategory(code?: string): Category {
  if (!code) return "unknown";
  const direct = CATEGORY_BY_RULE[code];
  return direct ?? "unknown";
}

function runCommand(
  command: string[],
  timeoutMs = 180_000,
): Promise<RunResult> {
  return new Promise((resolve) => {
    const proc = spawn(command[0], command.slice(1), { shell: false });
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
        checker: command[0] === "pyright" || command[0] === "python3"
          ? "pyright"
          : "ty",
        command,
        exitCode: timedOut ? -1 : code,
        stdout,
        stderr,
        raw: stdout || stderr,
        parseError: timedOut ? "Timed out" : undefined,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        checker: command[0] === "pyright" || command[0] === "python3"
          ? "pyright"
          : "ty",
        command,
        exitCode: -1,
        stdout,
        stderr: `${stderr}${err.message}`,
        raw: stdout || stderr || err.message,
        parseError: err.message,
      });
    });
  });
}

function normalizePath(inputPath: string): string {
  const cwd = process.cwd();
  const abs = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(cwd, inputPath);
  const rel = path.relative(cwd, abs);
  if (rel && !rel.startsWith("..")) return rel.replace(/\\/g, "/");
  return abs.replace(/\\/g, "/");
}

function dedupeDiagnostics(diags: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  const result: Diagnostic[] = [];

  for (const d of diags) {
    const key = [d.checker, d.path, d.line, d.column, d.code ?? "", d.message]
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(d);
  }

  return result;
}

function aggregateCounts(diags: Diagnostic[]): AggregateCounts {
  const counts: AggregateCounts = { error: 0, warning: 0, info: 0 };
  for (const d of diags) {
    counts[d.severity] += 1;
  }
  return counts;
}

function groupByFile(diags: Diagnostic[]) {
  const files = new Map<string, Diagnostic[]>();
  for (const d of diags) {
    const list = files.get(d.path) ?? [];
    list.push(d);
    files.set(d.path, list);
  }

  return Array.from(files.entries())
    .map(([p, list]) => ({
      path: p,
      counts: aggregateCounts(list),
      diagnostics: list.sort((a, b) => a.line - b.line || a.column - b.column),
    }))
    .sort((a, b) =>
      b.counts.error - a.counts.error || b.counts.warning - a.counts.warning ||
      a.path.localeCompare(b.path)
    );
}

function parsePyrightJSON(
  stdout: string,
): { diagnostics: Diagnostic[]; parseError?: string } {
  try {
    const parsed = JSON.parse(stdout);
    const general = Array.isArray(parsed?.generalDiagnostics)
      ? parsed.generalDiagnostics
      : [];

    const diagnostics: Diagnostic[] = [];

    for (const item of general) {
      if (!item?.file || !item?.message) continue;
      const range = item.range ?? item;
      const line = Number(range?.start?.line ?? item.line ?? 0);
      const column = Number(range?.start?.character ?? item.column ?? 0);

      diagnostics.push({
        checker: "pyright",
        path: normalizePath(item.file),
        line: line > 0 ? line : 0,
        column: column > 0 ? column : 0,
        severity: normalizeSeverity(item.severity),
        category: mapCategory(item.rule),
        code: typeof item.rule === "string" ? item.rule : undefined,
        message: String(item.message ?? ""),
      });
    }

    return { diagnostics: dedupeDiagnostics(diagnostics) };
  } catch (err: unknown) {
    return {
      diagnostics: [],
      parseError: err?.message ?? "Failed to parse pyright JSON",
    };
  }
}

const TY_TEXT_RE =
  /^(?<path>[^:]+):(\d+):(\d+):\s*(?<severity>error|warning|info)?\s*(?<code>[A-Za-z0-9_\-\.]+)?\s*-?\s*(?<message>.+)$/i;

function parseTy(
  stdout: string,
  stderr: string,
): { diagnostics: Diagnostic[]; parseError?: string } {
  const diagnostics: Diagnostic[] = [];
  const combined = stdout || stderr;
  const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const match = TY_TEXT_RE.exec(line);
    if (!match || !match.groups) continue;

    const { path: p, severity, code, message } = match.groups;
    const lineNum = Number(match[2]) || 0;
    const colNum = Number(match[3]) || 0;

    diagnostics.push({
      checker: "ty",
      path: normalizePath(p),
      line: lineNum,
      column: colNum,
      severity: normalizeSeverity(severity),
      category: mapCategory(code),
      code: code || undefined,
      message: message?.trim() ?? "",
    });
  }

  return {
    diagnostics: dedupeDiagnostics(diagnostics),
    parseError: lines.length && diagnostics.length === 0
      ? "Unrecognized ty output format"
      : undefined,
  };
}

function selectCommands(profile: Profile): string[][] {
  if (profile === "pyright") {
    return [
      ["pyright", "--outputjson"],
      ["python3", "-m", "pyright", "--outputjson"],
    ];
  }
  if (profile === "ty") {
    return [["ty"]];
  }
  return [
    ...selectCommands("pyright"),
    ...selectCommands("ty"),
  ];
}

export default tool({
  description:
    "Run pyright and/or ty with fixed profiles and summarize diagnostics grouped by severity and file.",
  args: {
    profile: tool.schema.enum(PROFILES).describe(
      "Which checker profile to run: pyright, ty, or both",
    ),
    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Optional timeout per command in milliseconds"),
  },

  async execute(args) {
    const profile = args.profile as Profile;
    const timeout = args.timeout_ms ?? 180_000;

    const commands = selectCommands(profile);
    const runs: RunResult[] = [];
    const diagnostics: Diagnostic[] = [];

    for (const command of commands) {
      const run = await runCommand(command, timeout);
      runs.push(run);

      if (run.checker === "pyright") {
        const parsed = parsePyrightJSON(run.stdout);
        if (parsed.parseError) run.parseError = parsed.parseError;
        diagnostics.push(...parsed.diagnostics);
      } else {
        const parsed = parseTy(run.stdout, run.stderr);
        if (parsed.parseError) run.parseError = parsed.parseError;
        diagnostics.push(...parsed.diagnostics);
      }
    }

    const deduped = dedupeDiagnostics(diagnostics);
    const counts = aggregateCounts(deduped);
    const files = groupByFile(deduped);

    const anyCommandFailed = runs.some((r) =>
      r.exitCode !== 0 || r.exitCode === null || r.exitCode === -1
    );
    const ok = true;
    const passed = !anyCommandFailed && counts.error === 0;

    return {
      ok,
      profile,
      passed,
      counts,
      files,
      diagnostics: deduped,
      runs,
    };
  },
});
