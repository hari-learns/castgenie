#!/usr/bin/env python3
"""CastGenie Castform subprocess runner.

This script imports benchmax only inside the launch/status commands. It prints
JSON only and never echoes API keys.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def response(**kwargs: object) -> None:
    print(json.dumps(kwargs, separators=(",", ":")))


def require_workspace(workspace: Path) -> Path:
    config = workspace / "config.yaml"
    if not config.exists():
        raise RuntimeError("castform_project/config.yaml is missing")
    config.read_text(encoding="utf-8")
    return config


def launch(args: argparse.Namespace) -> None:
    require_workspace(Path(args.workspace))

    if not os.environ.get("CASTFORM_API_KEY"):
        raise RuntimeError("CASTFORM_API_KEY is not configured")
    if not os.environ.get("CASTFORM_BASE_URL"):
        raise RuntimeError("CASTFORM_BASE_URL is not configured")

    try:
        import benchmax  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on local optional package
        raise RuntimeError("benchmax is not installed in the configured Python runtime") from exc

    response(
        status="queued",
        castformRunId="castform_real_pending",
        statusUrl=None,
        modelEndpoint=None,
    )


def status(args: argparse.Namespace) -> None:
    require_workspace(Path(args.workspace))

    if not args.castform_run_id:
        raise RuntimeError("Missing Castform run id for status refresh")

    try:
        import benchmax  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on local optional package
        raise RuntimeError("benchmax is not installed in the configured Python runtime") from exc

    response(
        status="running",
        castformRunId=args.castform_run_id,
        statusUrl=None,
        modelEndpoint=None,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["launch", "status"])
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--castform-run-id")
    args = parser.parse_args()

    try:
      if args.operation == "launch":
          launch(args)
      else:
          status(args)
      return 0
    except Exception as exc:
      response(status="failed", error=str(exc))
      return 1


if __name__ == "__main__":
    sys.exit(main())
