import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import process from "node:process";

type Parameter = {
  name: string;
  type?: string;
  default?: string;
  has_default: boolean;
};

type FunctionSignature = {
  name: string;
  line: number;
  parameters: Parameter[];
  return_type?: string;
  docstring?: string;
};

type FixtureTemplate = {
  function_name: string;
  fixture_code: string;
  fixture_name: string;
  scope: "function" | "class" | "module" | "session";
  description: string;
};

type FixtureReport = {
  ok: boolean;
  file_path: string;
  functions: FunctionSignature[];
  fixtures: FixtureTemplate[];
  total_fixtures_generated: number;
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

async function parseFileSignatures(
  filePath: string,
  timeoutMs: number,
): Promise<FunctionSignature[]> {
  // Use Python AST parsing to extract function signatures
  const pythonScript = `
import ast
import json
import sys

def extract_functions(filepath):
    with open(filepath, 'r') as f:
        tree = ast.parse(f.read(), filepath)
    
    functions = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            params = []
            for arg in node.args.args:
                param = {
                    'name': arg.arg,
                    'type': ast.unparse(arg.annotation) if arg.annotation else None,
                    'has_default': False
                }
                params.append(param)
            
            # Add defaults
            defaults_offset = len(node.args.args) - len(node.args.defaults)
            for i, default in enumerate(node.args.defaults):
                param_idx = defaults_offset + i
                if param_idx < len(params):
                    params[param_idx]['default'] = ast.unparse(default)
                    params[param_idx]['has_default'] = True
            
            docstring = ast.get_docstring(node)
            
            functions.append({
                'name': node.name,
                'line': node.lineno,
                'parameters': params,
                'return_type': ast.unparse(node.returns) if node.returns else None,
                'docstring': docstring
            })
    
    return functions

if __name__ == '__main__':
    filepath = sys.argv[1]
    functions = extract_functions(filepath)
    print(json.dumps(functions, indent=2))
`;

  const result = await runCommand(
    ["python3", "-c", pythonScript, filePath],
    timeoutMs,
  );

  if (result.exitCode !== 0) {
    return [];
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return [];
  }
}

function generateFixture(func: FunctionSignature): FixtureTemplate {
  const fixtureName = `${func.name}_fixture`;
  let fixtureCode = `@pytest.fixture\n`;
  fixtureCode += `def ${fixtureName}():\n`;
  fixtureCode += `    """Auto-generated fixture for ${func.name}.\n`;
  if (func.docstring) {
    fixtureCode += `    \n    Original function: ${
      func.docstring.split("\n")[0]
    }\n`;
  }
  fixtureCode += `    """\n`;

  // Generate mock parameters based on type hints
  const mocks: string[] = [];
  for (const param of func.parameters) {
    if (param.name === "self") continue;

    let mockValue = "None";
    if (param.type) {
      const lowerType = param.type.toLowerCase();
      if (lowerType.includes("str")) mockValue = `"test_${param.name}"`;
      else if (lowerType.includes("int")) mockValue = "42";
      else if (lowerType.includes("float")) mockValue = "3.14";
      else if (lowerType.includes("bool")) mockValue = "True";
      else if (lowerType.includes("list")) mockValue = "[]";
      else if (lowerType.includes("dict")) mockValue = "{}";
      else if (lowerType.includes("set")) mockValue = "set()";
      else mockValue = `Mock(spec=${param.type})`;
    } else if (param.default) {
      mockValue = param.default;
    } else {
      mockValue = `Mock()`;
    }

    mocks.push(`    ${param.name} = ${mockValue}`);
  }

  if (mocks.length > 0) {
    fixtureCode += mocks.join("\n") + "\n";
    fixtureCode += "    \n";
  }

  // Return appropriate structure
  if (func.parameters.length <= 1) {
    fixtureCode += `    return None  # Modify as needed\n`;
  } else {
    const paramNames = func.parameters
      .filter((p) => p.name !== "self")
      .map((p) => p.name);
    fixtureCode += `    return {${
      paramNames.map((n) => `'${n}': ${n}`).join(", ")
    }}\n`;
  }

  return {
    function_name: func.name,
    fixture_code: fixtureCode,
    fixture_name: fixtureName,
    scope: "function",
    description:
      `Auto-generated fixture for ${func.name} with ${func.parameters.length} parameters`,
  };
}

export default tool({
  description:
    "Auto-generate pytest fixtures from function signatures and docstrings. Scaffolds common fixture patterns based on type hints.",
  args: {
    file_path: tool.schema
      .string()
      .describe("Python file to analyze for fixture generation"),

    function_names: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Specific function names to generate fixtures for (default: all)",
      ),

    include_mock_imports: tool.schema
      .boolean()
      .optional()
      .describe("Include mock import statements in output (default: true)"),

    timeout_ms: tool.schema
      .number()
      .optional()
      .describe("Timeout in milliseconds (default: 30000)"),
  },

  async execute(args) {
    const filePath = args.file_path;
    const functionNames = args.function_names;
    const _includeMockImports = args.include_mock_imports ?? true;
    const timeoutMs = args.timeout_ms ?? 30_000;

    try {
      const functions = await parseFileSignatures(filePath, timeoutMs);

      if (functions.length === 0) {
        return {
          ok: true,
          file_path: filePath,
          functions: [],
          fixtures: [],
          total_fixtures_generated: 0,
          error: "No functions found in file",
        } as FixtureReport;
      }

      // Filter by function names if provided
      const filteredFunctions = functionNames
        ? functions.filter((f) => functionNames.includes(f.name))
        : functions;

      const fixtures = filteredFunctions.map((func) => generateFixture(func));

      return {
        ok: true,
        file_path: filePath,
        functions: filteredFunctions,
        fixtures,
        total_fixtures_generated: fixtures.length,
      } as FixtureReport;
    } catch (err: unknown) {
      return {
        ok: false,
        file_path: filePath,
        functions: [],
        fixtures: [],
        total_fixtures_generated: 0,
        error: err?.message ?? "Failed to generate fixtures",
      } as FixtureReport;
    }
  },
});
