#!/usr/bin/env python3
"""
Extract public API symbols from Python source code.
This script is used by api_diff_reporter.ts to analyze API changes between git refs.
"""

import ast
import json
import sys


def extract_public_api(content, filepath):
    """Extract all public API symbols from Python content."""
    try:
        tree = ast.parse(content, filepath)
    except SyntaxError:
        return []

    symbols = []
    module_name = filepath.replace(".py", "").replace("/", ".")

    # Check for __all__ definition
    all_exports = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "__all__":
                    if isinstance(node.value, (ast.List, ast.Tuple)):
                        # Handle both ast.Str (Python < 3.8) and ast.Constant (Python >= 3.8)
                        all_exports = []
                        for elt in node.value.elts:
                            if isinstance(elt, ast.Str):
                                all_exports.append(elt.s)
                            elif isinstance(elt, ast.Constant) and isinstance(
                                elt.value, str
                            ):
                                all_exports.append(elt.value)

    for node in tree.body:
        name = None
        symbol_type = None
        signature = None

        if isinstance(node, ast.ClassDef):
            name = node.name
            symbol_type = "class"
            signature = f"class {name}"
        elif isinstance(node, ast.FunctionDef):
            name = node.name
            symbol_type = "function"
            args = [arg.arg for arg in node.args.args]
            signature = f'def {name}({", ".join(args)})'
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    name = target.id
                    # Distinguish constants (UPPER_CASE) from variables
                    symbol_type = "constant" if name.isupper() else "variable"

        # Only include public symbols (not starting with _) or those in __all__
        if name and not name.startswith("_"):
            if all_exports is None or name in all_exports:
                symbols.append(
                    {
                        "name": name,
                        "type": symbol_type,
                        "signature": signature,
                        "module": module_name,
                        "line": node.lineno,
                    }
                )

    return symbols


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract_api.py <filepath>", file=sys.stderr)
        sys.exit(1)

    content = sys.stdin.read()
    filepath = sys.argv[1]
    symbols = extract_public_api(content, filepath)
    print(json.dumps(symbols, indent=2))
