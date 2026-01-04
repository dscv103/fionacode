import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

type ConventionalCommit = {
  hash: string;
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
    | "chore"
    | "revert"
    | "other";
  scope?: string;
  breaking: boolean;
  subject: string;
  body?: string;
  footer?: string;
  author: string;
  date: string;
};

type ChangelogSection = {
  title: string;
  commits: ConventionalCommit[];
};

type ChangelogReport = {
  ok: boolean;
  version?: string;
  date: string;
  sections: ChangelogSection[];
  breaking_changes: ConventionalCommit[];
  total_commits: number;
  markdown: string;
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

function parseConventionalCommit(line: string): ConventionalCommit | null {
  // Format: hash|author|date|message
  const parts = line.split("|");
  if (parts.length < 4) return null;

  const [hash, author, date, ...messageParts] = parts;
  const message = messageParts.join("|");

  // Parse conventional commit format: type(scope)!: subject
  const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;
  const match = message.match(conventionalRegex);

  if (!match) {
    return {
      hash,
      type: "other",
      breaking: false,
      subject: message,
      author,
      date,
    };
  }

  const [, type, scope, breakingMarker, subject] = match;
  const validTypes = [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "revert",
  ];
  const commitType = validTypes.includes(type)
    ? (type as ConventionalCommit["type"])
    : "other";

  return {
    hash,
    type: commitType,
    scope: scope || undefined,
    breaking: !!breakingMarker ||
      message.toLowerCase().includes("breaking change"),
    subject,
    author,
    date,
  };
}

async function getCommitsSinceTag(
  fromRef: string,
  toRef: string,
  timeoutMs: number,
): Promise<ConventionalCommit[]> {
  const format = "%H|%an|%ad|%s";
  const args = [
    "log",
    `${fromRef}..${toRef}`,
    `--format=${format}`,
    "--date=short",
    "--no-merges",
  ];

  const result = await runCommand(["git", ...args], timeoutMs);

  if (result.exitCode !== 0) {
    return [];
  }

  const commits: ConventionalCommit[] = [];
  const lines = result.stdout.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const commit = parseConventionalCommit(line);
    if (commit) {
      commits.push(commit);
    }
  }

  return commits;
}

function generateMarkdown(report: ChangelogReport): string {
  const lines: string[] = [];

  lines.push(`# Changelog`);
  lines.push("");

  if (report.version) {
    lines.push(`## [${report.version}] - ${report.date}`);
  } else {
    lines.push(`## Unreleased - ${report.date}`);
  }
  lines.push("");

  if (report.breaking_changes.length > 0) {
    lines.push("### ⚠️ BREAKING CHANGES");
    lines.push("");
    for (const commit of report.breaking_changes) {
      const scope = commit.scope ? `**${commit.scope}:** ` : "";
      lines.push(`- ${scope}${commit.subject} ([${commit.hash.slice(0, 7)}])`);
    }
    lines.push("");
  }

  for (const section of report.sections) {
    if (section.commits.length === 0) continue;

    lines.push(`### ${section.title}`);
    lines.push("");

    for (const commit of section.commits) {
      const scope = commit.scope ? `**${commit.scope}:** ` : "";
      lines.push(`- ${scope}${commit.subject} ([${commit.hash.slice(0, 7)}])`);
    }
    lines.push("");
  }

  if (report.total_commits === 0) {
    lines.push("_No changes in this release._");
    lines.push("");
  }

  return lines.join("\n");
}

export default tool({
  description:
    "Generate structured changelog from git commit messages using conventional commit format. Groups by type (feat/fix/docs/etc) and identifies breaking changes.",
  args: {
    from_ref: tool.schema
      .string()
      .optional()
      .describe(
        "Starting git reference (tag, commit, branch). Default: latest tag or HEAD~10",
      ),

    to_ref: tool.schema
      .string()
      .optional()
      .describe("Ending git reference (default: HEAD)"),

    version: tool.schema
      .string()
      .optional()
      .describe("Version string for the changelog header (e.g., '1.2.0')"),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 30000)"),
  },

  async execute(args) {
    const toRef = args.to_ref ?? "HEAD";
    const timeoutMs = args.timeout_ms ?? 30_000;
    const version = args.version;

    // Determine from_ref
    let fromRef = args.from_ref;
    if (!fromRef) {
      // Try to get the latest tag
      const tagResult = await runCommand(
        ["git", "describe", "--tags", "--abbrev=0"],
        5000,
      );
      fromRef = tagResult.exitCode === 0 ? tagResult.stdout.trim() : "HEAD~10";
    }

    const commits = await getCommitsSinceTag(fromRef, toRef, timeoutMs);

    if (commits.length === 0) {
      return {
        ok: true,
        version,
        date: new Date().toISOString().split("T")[0],
        sections: [],
        breaking_changes: [],
        total_commits: 0,
        markdown: generateMarkdown({
          ok: true,
          version,
          date: new Date().toISOString().split("T")[0],
          sections: [],
          breaking_changes: [],
          total_commits: 0,
          markdown: "",
        }),
      } as ChangelogReport;
    }

    const breakingChanges = commits.filter((c) => c.breaking);

    const sectionMap = new Map<string, ConventionalCommit[]>();
    const sectionTitles: Record<string, string> = {
      feat: "✨ Features",
      fix: "🐛 Bug Fixes",
      docs: "📚 Documentation",
      style: "💎 Styles",
      refactor: "♻️ Code Refactoring",
      perf: "⚡ Performance Improvements",
      test: "✅ Tests",
      build: "🏗️ Build System",
      ci: "👷 CI/CD",
      chore: "🔧 Chores",
      revert: "⏪ Reverts",
      other: "📦 Other Changes",
    };

    for (const commit of commits) {
      if (!sectionMap.has(commit.type)) {
        sectionMap.set(commit.type, []);
      }
      sectionMap.get(commit.type)!.push(commit);
    }

    const sections: ChangelogSection[] = [];
    const orderedTypes: ConventionalCommit["type"][] = [
      "feat",
      "fix",
      "perf",
      "refactor",
      "docs",
      "test",
      "build",
      "ci",
      "style",
      "chore",
      "revert",
      "other",
    ];

    for (const type of orderedTypes) {
      const commits = sectionMap.get(type);
      if (commits && commits.length > 0) {
        sections.push({
          title: sectionTitles[type] || "Other",
          commits,
        });
      }
    }

    const report: ChangelogReport = {
      ok: true,
      version,
      date: new Date().toISOString().split("T")[0],
      sections,
      breaking_changes: breakingChanges,
      total_commits: commits.length,
      markdown: "",
    };

    report.markdown = generateMarkdown(report);

    return report;
  },
});
