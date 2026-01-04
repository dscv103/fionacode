import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

type CommitSuggestion = {
  type:
    | "feat"
    | "fix"
    | "docs"
    | "style"
    | "refactor"
    | "perf"
    | "test"
    | "build"
    | "ci"
    | "chore";
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  confidence: number;
  reasoning: string;
};

type CommitReport = {
  ok: boolean;
  staged_files: string[];
  suggestions: CommitSuggestion[];
  recommended_commit: string;
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

async function getStagedFiles(timeoutMs: number): Promise<string[]> {
  const result = await runCommand(
    ["git", "diff", "--cached", "--name-only"],
    timeoutMs,
  );

  if (result.exitCode !== 0) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function getStagedDiff(timeoutMs: number): Promise<string> {
  const result = await runCommand(["git", "diff", "--cached"], timeoutMs);
  return result.stdout;
}

function analyzeChanges(
  files: string[],
  diff: string,
): CommitSuggestion[] {
  const suggestions: CommitSuggestion[] = [];

  // Analyze file patterns
  const hasTests = files.some((f) => f.includes("test"));
  const hasDocs = files.some((f) =>
    f.includes("README") || f.includes("docs/") || f.endsWith(".md")
  );
  const hasConfig = files.some((f) =>
    f.includes("config") || f.endsWith(".json") || f.endsWith(".yaml") ||
    f.endsWith(".toml")
  );
  const hasCI = files.some((f) =>
    f.includes(".github") || f.includes("ci/") || f.includes(".gitlab")
  );
  const hasSrc = files.some((f) =>
    f.endsWith(".py") || f.endsWith(".js") || f.endsWith(".ts")
  );

  // Analyze diff content
  const hasNewFeature = diff.includes("+def ") || diff.includes("+class ") ||
    diff.includes("+async def");
  const hasBugFix = /fix|bug|error|issue/i.test(diff);
  const hasBreaking = /breaking|BREAKING/i.test(diff);
  const hasRefactor = /refactor|restructure|reorganize/i.test(diff);
  const hasPerf = /performance|perf|optimize|speed/i.test(diff);

  // Generate suggestions based on analysis
  if (hasTests && !hasSrc) {
    suggestions.push({
      type: "test",
      subject: "add test coverage",
      confidence: 0.8,
      breaking: false,
      reasoning: "Only test files were modified",
    });
  }

  if (hasDocs && !hasSrc) {
    suggestions.push({
      type: "docs",
      subject: "update documentation",
      confidence: 0.9,
      breaking: false,
      reasoning: "Only documentation files were modified",
    });
  }

  if (hasConfig) {
    suggestions.push({
      type: "build",
      subject: "update configuration",
      confidence: 0.7,
      breaking: false,
      reasoning: "Configuration files were modified",
    });
  }

  if (hasCI) {
    suggestions.push({
      type: "ci",
      subject: "update CI/CD pipeline",
      confidence: 0.8,
      breaking: false,
      reasoning: "CI/CD configuration files were modified",
    });
  }

  if (hasNewFeature && hasSrc) {
    suggestions.push({
      type: "feat",
      subject: "add new feature",
      confidence: 0.7,
      breaking: hasBreaking,
      reasoning: "New classes or functions were added",
    });
  }

  if (hasBugFix) {
    suggestions.push({
      type: "fix",
      subject: "fix bug",
      confidence: 0.8,
      breaking: false,
      reasoning: "Changes appear to fix a bug or error",
    });
  }

  if (hasRefactor && hasSrc) {
    suggestions.push({
      type: "refactor",
      subject: "refactor code",
      confidence: 0.7,
      breaking: hasBreaking,
      reasoning: "Code restructuring detected",
    });
  }

  if (hasPerf) {
    suggestions.push({
      type: "perf",
      subject: "improve performance",
      confidence: 0.7,
      breaking: false,
      reasoning: "Performance optimization keywords detected",
    });
  }

  // Default suggestion if no specific pattern matched
  if (suggestions.length === 0) {
    suggestions.push({
      type: "chore",
      subject: "update code",
      confidence: 0.5,
      breaking: false,
      reasoning: "General code changes",
    });
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function buildCommitMessage(suggestion: CommitSuggestion): string {
  const breaking = suggestion.breaking ? "!" : "";
  const scope = suggestion.scope ? `(${suggestion.scope})` : "";

  let message = `${suggestion.type}${scope}${breaking}: ${suggestion.subject}`;

  if (suggestion.body) {
    message += `\n\n${suggestion.body}`;
  }

  if (suggestion.breaking) {
    message += `\n\nBREAKING CHANGE: This commit introduces breaking changes.`;
  }

  return message;
}

export default tool({
  description:
    "Analyze staged files and suggest conventional commit messages with type and scope based on changes.",
  args: {
    custom_subject: tool.schema
      .string()
      .optional()
      .describe(
        "Optional custom subject line to use instead of auto-generated",
      ),

    custom_scope: tool.schema
      .string()
      .optional()
      .describe(
        "Optional scope to include in commit message (e.g., 'api', 'auth', 'ui')",
      ),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 10000)"),
  },

  async execute(args) {
    const customSubject = args.custom_subject;
    const customScope = args.custom_scope;
    const timeoutMs = args.timeout_ms ?? 10_000;

    try {
      const stagedFiles = await getStagedFiles(timeoutMs);

      if (stagedFiles.length === 0) {
        return {
          ok: true,
          staged_files: [],
          suggestions: [],
          recommended_commit: "",
          error: "No files staged for commit",
        } as CommitReport;
      }

      const diff = await getStagedDiff(timeoutMs);
      const suggestions = analyzeChanges(stagedFiles, diff);

      // Override with custom values if provided
      if (customSubject || customScope) {
        const topSuggestion = suggestions[0];
        if (customSubject) topSuggestion.subject = customSubject;
        if (customScope) topSuggestion.scope = customScope;
      }

      const recommendedCommit = buildCommitMessage(suggestions[0]);

      return {
        ok: true,
        staged_files: stagedFiles,
        suggestions,
        recommended_commit: recommendedCommit,
      } as CommitReport;
    } catch (err: unknown) {
      return {
        ok: false,
        staged_files: [],
        suggestions: [],
        recommended_commit: "",
        error: err?.message ?? "Failed to build commit message",
      } as CommitReport;
    }
  },
});
