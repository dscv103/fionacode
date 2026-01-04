import { tool } from "@opencode-ai/plugin"

type HandoffIssue = {
  section: string
  type: "missing" | "invalid" | "incomplete"
  severity: "error" | "warning"
  description: string
}

type HandoffValidation = {
  ok: boolean
  valid: boolean
  sections_found: string[]
  sections_missing: string[]
  issues: HandoffIssue[]
  response_text: string
  error?: string
}

const REQUIRED_SECTIONS = [
  "status",
  "artifacts",
  "next-action",
] as const

const OPTIONAL_SECTIONS = [
  "notes",
  "blockers",
  "summary",
  "recommendations",
] as const

function extractSections(responseText: string): Map<string, string> {
  const sections = new Map<string, string>()
  
  // Match markdown headers or **bold** sections
  const headerRegex = /(?:^|\n)(?:#+\s*|\*\*)(status|artifacts|next-action|notes|blockers|summary|recommendations)(?:\s*\*\*)?:?\s*([\s\S]*?)(?=\n(?:#+\s*|\*\*)(?:status|artifacts|next-action|notes|blockers|summary|recommendations)|$)/gi
  
  let match
  while ((match = headerRegex.exec(responseText)) !== null) {
    const section = match[1].toLowerCase().replace(/\s+/g, "-")
    const content = match[2].trim()
    sections.set(section, content)
  }
  
  return sections
}

function validateStatus(content: string): HandoffIssue | null {
  if (!content || content.length === 0) {
    return {
      section: "status",
      type: "missing",
      severity: "error",
      description: "Status section is empty",
    }
  }
  
  const validStatuses = ["complete", "in-progress", "blocked", "failed", "needs-review"]
  const hasValidStatus = validStatuses.some((status) => 
    content.toLowerCase().includes(status)
  )
  
  if (!hasValidStatus) {
    return {
      section: "status",
      type: "invalid",
      severity: "warning",
      description: `Status should be one of: ${validStatuses.join(", ")}`,
    }
  }
  
  return null
}

function validateArtifacts(content: string): HandoffIssue | null {
  if (!content || content.length === 0) {
    return {
      section: "artifacts",
      type: "missing",
      severity: "error",
      description: "Artifacts section is empty - should list files created/modified",
    }
  }
  
  // Check if it contains file paths or "none"
  const hasFileInfo = /[\/\w]+\.\w+|none|n\/a/i.test(content)
  
  if (!hasFileInfo) {
    return {
      section: "artifacts",
      type: "incomplete",
      severity: "warning",
      description: "Artifacts section should list specific files or state 'none'",
    }
  }
  
  return null
}

function validateNextAction(content: string): HandoffIssue | null {
  if (!content || content.length === 0) {
    return {
      section: "next-action",
      type: "missing",
      severity: "error",
      description: "Next-action section is empty - should specify what to do next",
    }
  }
  
  // Check for actionable language
  const hasAction = /(?:run|execute|test|review|merge|deploy|implement|fix|update|create)/i.test(content)
  
  if (!hasAction) {
    return {
      section: "next-action",
      type: "incomplete",
      severity: "warning",
      description: "Next-action should contain clear actionable steps",
    }
  }
  
  return null
}

export default tool({
  description:
    "Validate agent handoff responses contain required sections (status/artifacts/next-action). Enforces the handoff contract defined in prompts.",
  args: {
    response_text: tool.schema
      .string()
      .describe("The agent's handoff response text to validate"),

    require_optional: tool.schema
      .boolean()
      .optional()
      .describe("Require optional sections like notes and blockers (default: false)"),

    strict_mode: tool.schema
      .boolean()
      .optional()
      .describe("Treat warnings as errors (default: false)"),
  },

  async execute(args) {
    const responseText = args.response_text
    const requireOptional = args.require_optional ?? false
    const strictMode = args.strict_mode ?? false

    const sections = extractSections(responseText)
    const issues: HandoffIssue[] = []
    const sectionsFound: string[] = []
    const sectionsMissing: string[] = []

    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
      if (sections.has(section)) {
        sectionsFound.push(section)
        
        // Validate content
        const content = sections.get(section)!
        let issue: HandoffIssue | null = null
        
        if (section === "status") {
          issue = validateStatus(content)
        } else if (section === "artifacts") {
          issue = validateArtifacts(content)
        } else if (section === "next-action") {
          issue = validateNextAction(content)
        }
        
        if (issue) {
          issues.push(issue)
        }
      } else {
        sectionsMissing.push(section)
        issues.push({
          section,
          type: "missing",
          severity: "error",
          description: `Required section '${section}' not found in response`,
        })
      }
    }

    // Check optional sections if required
    if (requireOptional) {
      for (const section of OPTIONAL_SECTIONS) {
        if (sections.has(section)) {
          sectionsFound.push(section)
        } else {
          sectionsMissing.push(section)
          issues.push({
            section,
            type: "missing",
            severity: "warning",
            description: `Optional section '${section}' not found in response`,
          })
        }
      }
    } else {
      // Just note which optional sections are present
      for (const section of OPTIONAL_SECTIONS) {
        if (sections.has(section)) {
          sectionsFound.push(section)
        }
      }
    }

    // Determine if valid
    const errorCount = issues.filter((i) => i.severity === "error").length
    const warningCount = issues.filter((i) => i.severity === "warning").length
    
    const valid = strictMode 
      ? errorCount === 0 && warningCount === 0
      : errorCount === 0

    return {
      ok: true,
      valid,
      sections_found: sectionsFound,
      sections_missing: sectionsMissing,
      issues,
      response_text: responseText,
    } as HandoffValidation
  },
})
