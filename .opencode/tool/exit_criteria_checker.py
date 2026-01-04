#!/usr/bin/env python3

import json
import sys
from dataclasses import dataclass
from typing import Any, Dict, Optional


BRANCH_COVERAGE_THRESHOLD = 70.0


def _as_bool(value: Any) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "yes", "1", "pass", "passed"}:
            return True
        if lowered in {"false", "no", "0", "fail", "failed"}:
            return False
    return None


def _as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _as_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


@dataclass
class CriterionResult:
    met: bool
    value: Any
    threshold: Any
    reason: str


def evaluate(payload: Dict[str, Any]) -> Dict[str, Any]:
    tests_passed = _as_bool(payload.get("tests_passed"))
    type_checks_passed = _as_bool(payload.get("type_checks_passed"))
    branch_coverage = _as_float(payload.get("branch_coverage"))
    critical_issues_count = _as_int(payload.get("critical_issues_count"))

    tests_ok = CriterionResult(
        met=(tests_passed is True),
        value=tests_passed,
        threshold=True,
        reason=(
            "tests_passed must be true" if tests_passed is not True else "tests passed"
        ),
    )

    coverage_ok = CriterionResult(
        met=(
            branch_coverage is not None and branch_coverage > BRANCH_COVERAGE_THRESHOLD
        ),
        value=branch_coverage,
        threshold=f"> {BRANCH_COVERAGE_THRESHOLD}",
        reason=(
            "branch_coverage must be provided"
            if branch_coverage is None
            else (
                f"branch_coverage must be > {BRANCH_COVERAGE_THRESHOLD}"
                if branch_coverage <= BRANCH_COVERAGE_THRESHOLD
                else "branch coverage above threshold"
            )
        ),
    )

    typecheck_ok = CriterionResult(
        met=(type_checks_passed is True),
        value=type_checks_passed,
        threshold=True,
        reason=(
            "type_checks_passed must be true"
            if type_checks_passed is not True
            else "type checks passed"
        ),
    )

    critical_ok = CriterionResult(
        met=(critical_issues_count == 0),
        value=critical_issues_count,
        threshold=0,
        reason=(
            "critical_issues_count must be provided"
            if critical_issues_count is None
            else (
                "no critical issues"
                if critical_issues_count == 0
                else "critical issues must be 0"
            )
        ),
    )

    criteria = {
        "tests_passed": tests_ok,
        "branch_coverage": coverage_ok,
        "type_checks_passed": typecheck_ok,
        "critical_issues_count": critical_ok,
    }

    unmet = [
        {
            "key": key,
            "reason": result.reason,
            "value": result.value,
            "threshold": result.threshold,
        }
        for key, result in criteria.items()
        if not result.met
    ]

    met_count = sum(1 for r in criteria.values() if r.met)
    score = int(round((met_count / 4.0) * 100))

    decision = "approve" if met_count == 4 else "iterate"

    summary = "Exit criteria met" if decision == "approve" else "Exit criteria NOT met"

    return {
        "ok": True,
        "decision": decision,
        "score": score,
        "thresholds": {
            "branch_coverage": f"> {BRANCH_COVERAGE_THRESHOLD}",
            "tests_passed": True,
            "type_checks_passed": True,
            "critical_issues_count": 0,
        },
        "inputs": {
            "tests_passed": tests_passed,
            "branch_coverage": branch_coverage,
            "type_checks_passed": type_checks_passed,
            "critical_issues_count": critical_issues_count,
        },
        "criteria": {
            key: {
                "met": result.met,
                "value": result.value,
                "threshold": result.threshold,
                "reason": result.reason,
            }
            for key, result in criteria.items()
        },
        "unmet": unmet,
        "summary": summary,
    }


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
        if not isinstance(payload, dict):
            raise ValueError("Input payload must be a JSON object")

        result = evaluate(payload)
        sys.stdout.write(json.dumps(result))
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        sys.stdout.write(json.dumps({"ok": False, "error": str(exc)}) + "\n")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
