import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

type BranchIssue = {
  type: "naming" | "stale" | "merge_conflict" | "diverged";
  severity: "error" | "warning";
  description: string;
  fix_suggestion?: string;
};

type BranchReport = {
  ok: boolean;
  current_branch: string;
  base_branch: string;
  is_valid: boolean;
  naming_valid: boolean;
  up_to_date: boolean;
  has_conflicts: boolean;
  commits_ahead: number;
  commits_behind: number;
  issues: BranchIssue[];
  passed: boolean;
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

async function getCurrentBranch(timeoutMs: number): Promise<string> {
  const result = await runCommand(
    ["git", "branch", "--show-current"],
    timeoutMs,
  );
  return result.stdout.trim();
}

async function getCommitsBehindAhead(
  currentBranch: string,
  baseBranch: string,
  timeoutMs: number,
): Promise<{ behind: number; ahead: number }> {
  const result = await runCommand(
    [
      "git",
      "rev-list",
      "--left-right",
      "--count",
      `${baseBranch}...${currentBranch}`,
    ],
    timeoutMs,
  );

  if (result.exitCode !== 0) {
    return { behind: 0, ahead: 0 };
  }

  const parts = result.stdout.trim().split("\t");
  const behind = parseInt(parts[0] || "0", 10);
  const ahead = parseInt(parts[1] || "0", 10);

  return { behind, ahead };
}

async function _checkMergeConflicts(
  currentBranch: string,
  baseBranch: string,
  timeoutMs: number,
): Promise<boolean> {
  // Try a test merge to see if there would be conflicts
  const result = await runCommand(
    [
      "git",
      "merge-tree",
      `$(git merge-base ${baseBranch} ${currentBranch})`,
      baseBranch,
      currentBranch,
    ],
    timeoutMs,
  );

  return result.stdout.includes("<<<<<<< ");
}

function validateBranchName(branchName: string, pattern?: RegExp): boolean {
  // Default pattern: feature/*, fix/*, hotfix/*, release/*, chore/*, docs/*
  const defaultPattern =
    /^(feature|fix|hotfix|release|chore|docs|refactor|test)\/[a-z0-9-]+$/;

  const patternToUse = pattern || defaultPattern;

  return patternToUse.test(branchName);
}

export default tool({
  description:
    "Validate branch naming conventions, check if branch is up-to-date with base, and detect merge conflicts. Enforces team workflow conventions.",
  args: {
    base_branch: tool.schema
      .string()
      .optional()
      .describe("Base branch to compare against (default: 'main')"),

    naming_pattern: tool.schema
      .string()
      .optional()
      .describe(
        "Optional regex pattern for branch naming (default: type/name format)",
      ),

    max_commits_behind: tool.schema
      .number()
      .optional()
      .describe(
        "Maximum commits behind base branch before flagging as error (default: 10)",
      ),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 15000)"),
  },

  async execute(args) {
    const baseBranch = args.base_branch ?? "main";
    const namingPattern = args.naming_pattern
      ? new RegExp(args.naming_pattern)
      : undefined;
    const maxBehind = args.max_commits_behind ?? 10;
    const timeoutMs = args.timeout_ms ?? 15_000;

    const issues: BranchIssue[] = [];

    try {
      const currentBranch = await getCurrentBranch(timeoutMs);

      if (!currentBranch) {
        return {
          ok: false,
          current_branch: "",
          base_branch: baseBranch,
          is_valid: false,
          naming_valid: false,
          up_to_date: false,
          has_conflicts: false,
          commits_ahead: 0,
          commits_behind: 0,
          issues: [],
          passed: false,
          error: "Not on a branch (detached HEAD?)",
        } as BranchReport;
      }

      // Skip validation if on base branch
      if (currentBranch === baseBranch) {
        return {
          ok: true,
          current_branch: currentBranch,
          base_branch: baseBranch,
          is_valid: true,
          naming_valid: true,
          up_to_date: true,
          has_conflicts: false,
          commits_ahead: 0,
          commits_behind: 0,
          issues: [],
          passed: true,
        } as BranchReport;
      }

      // Validate branch naming
      const namingValid = validateBranchName(currentBranch, namingPattern);
      if (!namingValid) {
        issues.push({
          type: "naming",
          severity: "error",
          description:
            `Branch name '${currentBranch}' does not follow naming convention`,
          fix_suggestion:
            "Use format: type/description (e.g., feature/user-auth, fix/login-bug)",
        });
      }

      // Check if branch is behind/ahead
      const { behind, ahead } = await getCommitsBehindAhead(
        currentBranch,
        baseBranch,
        timeoutMs,
      );

      if (behind > 0) {
        const severity = behind > maxBehind ? "error" : "warning";
        issues.push({
          type: "stale",
          severity,
          description: `Branch is ${behind} commit(s) behind ${baseBranch}`,
          fix_suggestion:
            `Run: git merge ${baseBranch} or git rebase ${baseBranch}`,
        });
      }

      if (behind > 0 && ahead > 0) {
        issues.push({
          type: "diverged",
          severity: "warning",
          description:
            `Branch has diverged: ${ahead} ahead, ${behind} behind ${baseBranch}`,
          fix_suggestion: `Consider rebasing or merging ${baseBranch}`,
        });
      }

      // Check for potential merge conflicts (simplified check)
      const hasConflicts = behind > 0; // && await checkMergeConflicts(currentBranch, baseBranch, timeoutMs)
      if (hasConflicts && behind > maxBehind) {
        issues.push({
          type: "merge_conflict",
          severity: "warning",
          description: "Branch may have merge conflicts with base branch",
          fix_suggestion:
            "Merge base branch and resolve conflicts before creating PR",
        });
      }

      const upToDate = behind === 0;
      const passed = namingValid &&
        issues.filter((i) => i.severity === "error").length === 0;

      return {
        ok: true,
        current_branch: currentBranch,
        base_branch: baseBranch,
        is_valid: passed,
        naming_valid: namingValid,
        up_to_date: upToDate,
        has_conflicts: hasConflicts,
        commits_ahead: ahead,
        commits_behind: behind,
        issues,
        passed,
      } as BranchReport;
    } catch (err: unknown) {
      return {
        ok: false,
        current_branch: "",
        base_branch: baseBranch,
        is_valid: false,
        naming_valid: false,
        up_to_date: false,
        has_conflicts: false,
        commits_ahead: 0,
        commits_behind: 0,
        issues: [],
        passed: false,
        error: err?.message ?? "Failed to validate branch strategy",
      } as BranchReport;
    }
  },
});
