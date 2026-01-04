import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

type Vulnerability = {
  package: string;
  version: string;
  vulnerability_id: string;
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  description: string;
  fixed_in?: string;
};

type LicenseIssue = {
  package: string;
  version: string;
  license: string;
  issue_type: "incompatible" | "unknown" | "copyleft";
  description: string;
};

type OutdatedPackage = {
  package: string;
  current_version: string;
  latest_version: string;
  update_type: "major" | "minor" | "patch";
};

type AuditReport = {
  ok: boolean;
  vulnerabilities: Vulnerability[];
  license_issues: LicenseIssue[];
  outdated_packages: OutdatedPackage[];
  vulnerability_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  total_vulnerabilities: number;
  total_license_issues: number;
  total_outdated: number;
  passed: boolean;
  error?: string;
};

function runCommand(
  command: string[],
  timeoutMs: number,
  input?: string,
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

    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
}

function parseSeverity(
  sev: string,
): "critical" | "high" | "medium" | "low" | "unknown" {
  const normalized = sev.toLowerCase().trim();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "medium" || normalized === "moderate") return "medium";
  if (normalized === "low") return "low";
  return "unknown";
}

async function runPipAudit(timeoutMs: number): Promise<Vulnerability[]> {
  const result = await runCommand(["pip-audit", "--format", "json"], timeoutMs);

  if (result.exitCode === -1) {
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    const vulnerabilities: Vulnerability[] = [];

    if (Array.isArray(data.dependencies)) {
      for (const dep of data.dependencies) {
        const pkg = dep.name || "unknown";
        const version = dep.version || "unknown";

        if (Array.isArray(dep.vulns)) {
          for (const vuln of dep.vulns) {
            vulnerabilities.push({
              package: pkg,
              version,
              vulnerability_id: vuln.id || "UNKNOWN",
              severity: parseSeverity(vuln.severity || "unknown"),
              description: vuln.description || vuln.summary || "No description",
              fixed_in: vuln.fix_versions?.[0] || undefined,
            });
          }
        }
      }
    }

    return vulnerabilities;
  } catch {
    // pip-audit not installed or failed, return empty
    return [];
  }
}

async function runSafety(timeoutMs: number): Promise<Vulnerability[]> {
  const result = await runCommand(
    ["safety", "check", "--json", "--output", "json"],
    timeoutMs,
  );

  if (result.exitCode === -1) {
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    const vulnerabilities: Vulnerability[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        vulnerabilities.push({
          package: item[0] || "unknown",
          version: item[2] || "unknown",
          vulnerability_id: item[3] || "UNKNOWN",
          severity: parseSeverity(item[4] || "unknown"),
          description: item[1] || "No description",
          fixed_in: undefined,
        });
      }
    }

    return vulnerabilities;
  } catch {
    // safety not installed or failed
    return [];
  }
}

async function checkLicenses(timeoutMs: number): Promise<LicenseIssue[]> {
  const result = await runCommand(
    ["pip-licenses", "--format", "json", "--with-system"],
    timeoutMs,
  );

  if (result.exitCode === -1 || result.exitCode !== 0) {
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    const issues: LicenseIssue[] = [];

    // List of problematic licenses
    const copyleftLicenses = ["GPL", "AGPL", "LGPL"];
    const incompatibleLicenses = ["AGPL"];

    if (Array.isArray(data)) {
      for (const pkg of data) {
        const license = pkg.License || pkg.license || "UNKNOWN";
        const name = pkg.Name || pkg.name || "unknown";
        const version = pkg.Version || pkg.version || "unknown";

        if (license === "UNKNOWN" || !license) {
          issues.push({
            package: name,
            version,
            license: "UNKNOWN",
            issue_type: "unknown",
            description: "License information not available",
          });
          continue;
        }

        for (const incompatible of incompatibleLicenses) {
          if (license.includes(incompatible)) {
            issues.push({
              package: name,
              version,
              license,
              issue_type: "incompatible",
              description:
                `${incompatible} license may be incompatible with commercial use`,
            });
            break;
          }
        }

        for (const copyleft of copyleftLicenses) {
          if (
            license.includes(copyleft) &&
            !issues.find((i) => i.package === name)
          ) {
            issues.push({
              package: name,
              version,
              license,
              issue_type: "copyleft",
              description:
                `${copyleft} license requires derivative works to use same license`,
            });
            break;
          }
        }
      }
    }

    return issues;
  } catch {
    return [];
  }
}

async function checkOutdated(timeoutMs: number): Promise<OutdatedPackage[]> {
  const result = await runCommand(
    ["pip", "list", "--outdated", "--format", "json"],
    timeoutMs,
  );

  if (result.exitCode === -1 || result.exitCode !== 0) {
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    const outdated: OutdatedPackage[] = [];

    if (Array.isArray(data)) {
      for (const pkg of data) {
        const name = pkg.name || "unknown";
        const current = pkg.version || "0.0.0";
        const latest = pkg.latest_version || "0.0.0";

        // Parse version numbers safely, handling edge cases
        const parseVersion = (version: string): number[] => {
          // Remove pre-release tags (rc, alpha, beta, etc.)
          const cleaned = version.split(/[-+]/)[0];
          const parts = cleaned.split(".");
          const parsed: number[] = [];
          
          for (let i = 0; i < 3; i++) {
            const part = parts[i];
            if (part) {
              const num = parseInt(part, 10);
              parsed.push(isNaN(num) ? 0 : num);
            } else {
              parsed.push(0);
            }
          }
          
          return parsed;
        };

        const currentParts = parseVersion(current);
        const latestParts = parseVersion(latest);

        let updateType: "major" | "minor" | "patch" = "patch";

        if (latestParts[0] > currentParts[0]) {
          updateType = "major";
        } else if (latestParts[0] === currentParts[0] && latestParts[1] > currentParts[1]) {
          updateType = "minor";
        }

        outdated.push({
          package: name,
          current_version: current,
          latest_version: latest,
          update_type: updateType,
        });
      }
    }

    return outdated;
  } catch {
    return [];
  }
}

export default tool({
  description:
    "Audit Python dependencies for known vulnerabilities (CVEs), license conflicts, and outdated packages using pip-audit, safety, and pip-licenses.",
  args: {
    check_vulnerabilities: tool.schema
      .boolean()
      .optional()
      .describe("Check for security vulnerabilities (default: true)"),

    check_licenses: tool.schema
      .boolean()
      .optional()
      .describe("Check for license issues (default: true)"),

    check_outdated: tool.schema
      .boolean()
      .optional()
      .describe("Check for outdated packages (default: true)"),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout per check in milliseconds (default: 60000)"),
  },

  async execute(args) {
    const checkVulns = args.check_vulnerabilities ?? true;
    const checkLics = args.check_licenses ?? true;
    const checkOut = args.check_outdated ?? true;
    const timeoutMs = args.timeout_ms ?? 60_000;

    const vulnerabilities: Vulnerability[] = [];
    const licenseIssues: LicenseIssue[] = [];
    const outdatedPackages: OutdatedPackage[] = [];
    
    let vulnCheckFailed = false;
    let licCheckFailed = false;

    if (checkVulns) {
      const pipAuditVulns = await runPipAudit(timeoutMs);
      const safetyVulns = await runSafety(timeoutMs);
      
      vulnerabilities.push(...pipAuditVulns);
      vulnerabilities.push(...safetyVulns);
      
      // If both tools returned empty AND both appeared to execute but found nothing,
      // we can't determine if they failed or if there are truly no vulnerabilities.
      // Check if at least one tool is available by running a version check
      if (pipAuditVulns.length === 0 && safetyVulns.length === 0) {
        const pipAuditCheck = await runCommand(["pip-audit", "--version"], 5000);
        const safetyCheck = await runCommand(["safety", "--version"], 5000);
        
        // Mark as failed only if BOTH tools are unavailable
        if (pipAuditCheck.exitCode !== 0 && safetyCheck.exitCode !== 0) {
          vulnCheckFailed = true;
        }
      }
    }

    if (checkLics) {
      const licenses = await checkLicenses(timeoutMs);
      licenseIssues.push(...licenses);
      
      // If check was requested but returned nothing, it likely failed
      if (licenses.length === 0) {
        // Try to verify if pip-licenses is available
        const testResult = await runCommand(["pip-licenses", "--help"], 5000);
        if (testResult.exitCode !== 0) {
          licCheckFailed = true;
        }
      }
    }

    if (checkOut) {
      const outdated = await checkOutdated(timeoutMs);
      outdatedPackages.push(...outdated);
    }

    const counts = {
      critical: vulnerabilities.filter((v) => v.severity === "critical").length,
      high: vulnerabilities.filter((v) => v.severity === "high").length,
      medium: vulnerabilities.filter((v) => v.severity === "medium").length,
      low: vulnerabilities.filter((v) => v.severity === "low").length,
    };

    // Only pass if no critical/high vulns AND checks didn't fail
    const passed = counts.critical === 0 && counts.high === 0 && !vulnCheckFailed;
    
    const warnings: string[] = [];
    if (vulnCheckFailed) {
      warnings.push("Vulnerability check tools (pip-audit, safety) unavailable or failed");
    }
    if (licCheckFailed) {
      warnings.push("License check tool (pip-licenses) unavailable or failed");
    }

    const report: AuditReport = {
      ok: !vulnCheckFailed || vulnerabilities.length > 0, // ok=false if checks failed AND no results
      vulnerabilities,
      license_issues: licenseIssues,
      outdated_packages: outdatedPackages,
      vulnerability_counts: counts,
      total_vulnerabilities: vulnerabilities.length,
      total_license_issues: licenseIssues.length,
      total_outdated: outdatedPackages.length,
      passed,
      error: warnings.length > 0 ? warnings.join("; ") : undefined,
    };

    return report;
  },
});
