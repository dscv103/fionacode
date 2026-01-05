#!/usr/bin/env python3
"""
Validate Python docstrings match function signatures.
This script is used by docstring_validator.ts to ensure documentation quality.
Supports Google, Sphinx, and NumPy docstring formats.
"""

import ast
import json
import sys
import re


def parse_docstring_params(docstring):
    """Extract parameter names from docstring.
    
    Supports multiple formats:
    - Google style: Args: or Parameters:
    - Sphinx/reST style: :param name:
    - NumPy style: parameter_name :
    """
    if not docstring:
        return []

    params = []

    # Google style: Args: or Parameters: followed by parameter names
    google_match = re.findall(
        r"(?:Args?|Parameters?):\s*\n\s+(\w+)", docstring, re.MULTILINE
    )
    params.extend(google_match)

    # Sphinx/reST style: :param name:
    sphinx_match = re.findall(r":param\s+(\w+):", docstring)
    params.extend(sphinx_match)

    # NumPy style: parameter_name :
    numpy_match = re.findall(r"^\s*(\w+)\s*:", docstring, re.MULTILINE)
    params.extend(numpy_match)

    return list(set(params))


def has_return_doc(docstring):
    """Check if docstring documents return value."""
    if not docstring:
        return False
    return bool(re.search(r"(?:Returns?|Yields?):", docstring, re.IGNORECASE))


def validate_file(filepath):
    """Validate all functions in a Python file."""
    with open(filepath, "r", encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read(), filepath)
        except SyntaxError as e:
            return {
                "error": f"Syntax error in {filepath}: {e}",
                "validations": [],
            }

    validations = []

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            docstring = ast.get_docstring(node)
            has_docstring = docstring is not None

            # Exclude 'self' and 'cls' from parameter checks
            actual_params = [
                arg.arg
                for arg in node.args.args
                if arg.arg not in ("self", "cls")
            ]
            documented_params = (
                parse_docstring_params(docstring) if has_docstring else []
            )

            missing_params = [
                p for p in actual_params if p not in documented_params
            ]
            extra_params = [
                p for p in documented_params if p not in actual_params
            ]

            has_return_annotation = node.returns is not None
            has_return_doc_flag = has_return_doc(docstring)

            issues = []

            if not has_docstring:
                issues.append(
                    {
                        "type": "missing",
                        "severity": "error",
                        "description": f"Function {node.name} has no docstring",
                        "line": node.lineno,
                    }
                )
            else:
                if missing_params:
                    issues.append(
                        {
                            "type": "incomplete",
                            "severity": "warning",
                            "description": f'Missing documentation for parameters: {", ".join(missing_params)}',
                            "line": node.lineno,
                        }
                    )

                if extra_params:
                    issues.append(
                        {
                            "type": "mismatch",
                            "severity": "warning",
                            "description": f'Documented parameters not in signature: {", ".join(extra_params)}',
                            "line": node.lineno,
                        }
                    )

                if has_return_annotation and not has_return_doc_flag:
                    issues.append(
                        {
                            "type": "incomplete",
                            "severity": "warning",
                            "description": "Function has return annotation but no return documentation",
                            "line": node.lineno,
                        }
                    )

            valid = len(issues) == 0

            validations.append(
                {
                    "name": node.name,
                    "line": node.lineno,
                    "has_docstring": has_docstring,
                    "param_count": len(actual_params),
                    "documented_params": documented_params,
                    "actual_params": actual_params,
                    "missing_params": missing_params,
                    "extra_params": extra_params,
                    "has_return_doc": has_return_doc_flag,
                    "has_return_annotation": has_return_annotation,
                    "issues": issues,
                    "valid": valid,
                }
            )

    return {"validations": validations}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_docstrings.py <filepath>", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    result = validate_file(filepath)

    if "error" in result:
        print(result["error"], file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result["validations"], indent=2))
