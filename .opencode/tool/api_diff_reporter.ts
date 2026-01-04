import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

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
  // Checkout the ref temporarily, extract API, then go back
  const pythonScript = `
import ast
import json
import sys

def extract_public_api(filepath):
    """Extract all public API symbols from a Python file."""
    try:
        with open(filepath, 'r') as f:
            tree = ast.parse(f.read(), filepath)
    except:
        return []
    
    symbols = []
    module_name = filepath.replace('.py', '').replace('/', '.')
    
    # Check for __all__ definition
    all_exports = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == '__all__':
                    if isinstance(node.value, (ast.List, ast.Tuple)):
                        all_exports = [elt.s for elt in node.value.elts if isinstance(elt, ast.Str)]
    
    for node in tree.body:
        name = None
        symbol_type = None
        signature = None
        
        if isinstance(node, ast.ClassDef):
            name = node.name
            symbol_type = 'class'
            signature = f'class {name}'
        elif isinstance(node, ast.FunctionDef):
            name = node.name
            symbol_type = 'function'
            args = [arg.arg for arg in node.args.args]
            signature = f'def {name}({", ".join(args)})'
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    name = target.id
                    # Distinguish constants (UPPER_CASE) from variables
                    symbol_type = 'constant' if name.isupper() else 'variable'
        
        # Only include public symbols (not starting with _) or those in __all__
        if name and not name.startswith('_'):
            if all_exports is None or name in all_exports:
                symbols.append({
                    'name': name,
                    'type': symbol_type,
                    'signature': signature,
                    'module': module_name,
                    'line': node.lineno
                })
    
    return symbols

if __name__ == '__main__':
    filepath = sys.argv[1]
    symbols = extract_public_api(filepath)
    print(json.dumps(symbols, indent=2))
`;

  // Save current HEAD
  const saveResult = await runCommand(["git", "rev-parse", "HEAD"], 5000);
  const originalRef = saveResult.stdout.trim();

  try {
    // Checkout the ref
    await runCommand(["git", "checkout", ref, "--quiet"], 10_000);

    // Extract API
    const result = await runCommand(
      ["python3", "-c", pythonScript, filePath],
      timeoutMs,
    );

    // Go back to original ref
    await runCommand(["git", "checkout", originalRef, "--quiet"], 10_000);

    if (result.exitCode !== 0) {
      return [];
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      return [];
    }
  } catch {
    // Ensure we go back even on error
    await runCommand(["git", "checkout", originalRef, "--quiet"], 10_000);
    return [];
  }
}

function compareAPIs(before: APISymbol[], after: APISymbol[]): APIDiff {
  const beforeMap = new Map(before.map((s) => [s.name, s]));
  const afterMap = new Map(after.map((s) => [s.name, s]));

  const added: APISymbol[] = [];
  const removed: APISymbol[] = [];
  const modified: APISymbol[] = [];
  const unchanged: APISymbol[] = [];

  // Find added and modified
  for (const [name, symbol] of afterMap) {
    if (!beforeMap.has(name)) {
      added.push(symbol);
    } else {
      const beforeSymbol = beforeMap.get(name)!;
      if (beforeSymbol.signature !== symbol.signature) {
        modified.push(symbol);
      } else {
        unchanged.push(symbol);
      }
    }
  }

  // Find removed
  for (const [name, symbol] of beforeMap) {
    if (!afterMap.has(name)) {
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

  return lines.join("\n");
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
