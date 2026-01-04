import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

function runPython(jsonPayload) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [".opencode/tool/exit_criteria_checker.py"], {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8")
    })

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8")
    })

    proc.on("error", (err) => reject(err))

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `exit_criteria_checker.py failed (code=${code}): ${stderr || stdout}`,
          ),
        )
        return
      }
      resolve(stdout.trim())
    })

    proc.stdin.write(JSON.stringify(jsonPayload ?? {}))
    proc.stdin.end()
  })
}

export default tool({
  description:
    "Evaluate workflow exit criteria from provided test/coverage/typecheck/review results.",
  args: {
    tests_passed: tool.schema
      .boolean()
      .optional()
      .describe("Whether the test suite passed"),
    branch_coverage: tool.schema
      .number()
      .optional()
      .describe("Branch coverage percentage (pytest or other)"),
    type_checks_passed: tool.schema
      .boolean()
      .optional()
      .describe("Whether type checks passed (e.g. mypy/tsc/pyright)"),
    critical_issues_count: tool.schema
      .number()
      .optional()
      .describe("Count of critical issues found in review (must be 0 to approve)"),
    notes: tool.schema
      .string()
      .optional()
      .describe("Optional context from the agent"),
  },

  async execute(args) {
    const raw = await runPython(args)

    try {
      return JSON.parse(raw)
    } catch {
      return {
        ok: false,
        error: "exit_criteria_checker returned non-JSON output",
        raw,
      }
    }
  },
})
