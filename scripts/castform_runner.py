#!/usr/bin/env python3
"""CastGenie Castform subprocess runner.

The Node app calls this script with fixed argument arrays. It emits JSON only
and never prints provider secrets.
"""

from __future__ import annotations

import argparse
import dataclasses
import importlib
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any


def response(**kwargs: object) -> None:
    print(json.dumps(kwargs, separators=(",", ":")))


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(f"Missing required JSON artifact: {path.name}")
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise RuntimeError(f"Missing required dataset: {path.name}")

    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))

    if not rows:
        raise RuntimeError(f"Dataset is empty: {path.name}")

    return rows


def require_workspace(workspace: Path) -> dict[str, Path]:
    config = workspace / "config.yaml"
    run_py = workspace / "run.py"
    env_py = workspace / "src" / "env.py"
    chunks = workspace / "data" / "chunks.jsonl"
    corpus_manifest = workspace / "data" / "corpus_manifest.json"
    train_dataset = workspace / "train_dataset.jsonl"
    eval_dataset = workspace / "eval_dataset.jsonl"
    rag_readiness = workspace / "rag_readiness.json"
    reward_spec = workspace / "rewards" / "reward_spec.json"

    required_paths = [
        config,
        run_py,
        env_py,
        chunks,
        corpus_manifest,
        train_dataset,
        eval_dataset,
        rag_readiness,
        reward_spec,
    ]
    for path in required_paths:
        if not path.exists():
            raise RuntimeError(f"Required Castform artifact is missing: {path.relative_to(workspace)}")

    return {
        "config": config,
        "run_py": run_py,
        "env_py": env_py,
        "chunks": chunks,
        "corpus_manifest": corpus_manifest,
        "train_dataset": train_dataset,
        "eval_dataset": eval_dataset,
        "rag_readiness": rag_readiness,
        "reward_spec": reward_spec,
    }


def import_benchmax() -> tuple[Any, Any]:
    try:
        from benchmax.platform.client import TrainerClient
        from benchmax.platform.training_run import upload_training_run
    except Exception as exc:  # pragma: no cover - depends on optional local package
        raise RuntimeError("benchmax is not installed in the configured Python runtime") from exc

    return TrainerClient, upload_training_run


def import_workspace_modules(workspace: Path) -> tuple[type[Any], list[Any]]:
    sys.path.insert(0, str(workspace))
    run_module = importlib.import_module("run")
    env_class = getattr(run_module, "Env", None) or getattr(run_module, "CastGenieRagEnv", None)
    if env_class is None:
        raise RuntimeError("Generated run.py must export Env or CastGenieRagEnv")
    local_modules = [
        run_module,
        importlib.import_module("src.env"),
        importlib.import_module("src.dataset"),
        importlib.import_module("src.tools"),
        importlib.import_module("src.rewards"),
        importlib.import_module("src.train"),
    ]
    return env_class, local_modules


def import_workspace_env(workspace: Path) -> type[Any]:
    env_class, _local_modules = import_workspace_modules(workspace)
    return env_class


def normalize_dataset(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows:
        question = str(row.get("question") or "").strip()
        answer = str(row.get("answer") or "").strip()
        reference_chunks = row.get("reference_chunks")
        if not question or not answer or not isinstance(reference_chunks, list) or not reference_chunks:
            continue
        normalized.append(
            {
                **row,
                "prompt": question,
                "ground_truth": answer,
            }
        )

    if not normalized:
        raise RuntimeError("No trainable question/answer rows were produced.")

    return normalized


def validate_workspace(workspace: Path) -> dict[str, Any]:
    paths = require_workspace(workspace)
    train_rows = normalize_dataset(read_jsonl(paths["train_dataset"]))
    eval_rows = normalize_dataset(read_jsonl(paths["eval_dataset"]))
    chunk_rows = read_jsonl(paths["chunks"])
    rag_readiness = read_json(paths["rag_readiness"])
    errors: list[str] = []
    warnings: list[str] = []

    if len(chunk_rows) < 3:
        errors.append("Castform corpus must contain at least 3 chunks.")
    if len(train_rows) < 1 or len(eval_rows) < 1:
        errors.append("Castform train and eval datasets must each contain at least one valid row.")
    if rag_readiness.get("readyForRealTraining") is not True:
        errors.extend(str(item) for item in rag_readiness.get("blockingIssues", []))
    warnings.extend(str(item) for item in rag_readiness.get("warnings", []))

    return {
        "status": "failed" if errors else "passed",
        "trainRows": len(train_rows),
        "evalRows": len(eval_rows),
        "corpusChunks": len(chunk_rows),
        "warnings": warnings,
        "errors": errors,
    }


def trainer_kwargs() -> dict[str, Any]:
    api_key = os.environ.get("CASTFORM_API_KEY")
    base_url = os.environ.get("CASTFORM_BASE_URL")
    if not api_key:
        raise RuntimeError("CASTFORM_API_KEY is not configured")
    kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url and base_url != "your_castform_base_url_here":
        kwargs["base_url"] = base_url
    return kwargs


def serving_base_model_id(base_model: str) -> str:
    override = os.environ.get("CASTFORM_SERVING_BASE_ID")
    if override:
        return override
    return base_model.rsplit("/", 1)[-1].lower()


def object_to_kwargs(value: Any) -> dict[str, Any]:
    if dataclasses.is_dataclass(value):
        return dataclasses.asdict(value)
    if isinstance(value, dict):
        return value
    if hasattr(value, "__dict__"):
        return dict(value.__dict__)
    raise RuntimeError("Castform upload_training_run returned an unsupported object.")


def preflight(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace)
    require_workspace(workspace)
    import_benchmax()
    import_workspace_env(workspace)
    response(status="ok", workspace=str(workspace))


def validate(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace)
    import_benchmax()
    import_workspace_env(workspace)
    response(**validate_workspace(workspace))


def launch(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace)
    validation = validate_workspace(workspace)
    if validation["status"] == "failed":
        response(status="failed", error="Castform validation failed", **validation)
        return

    TrainerClient, upload_training_run = import_benchmax()
    env_class, local_modules = import_workspace_modules(workspace)
    paths = require_workspace(workspace)
    train_data = normalize_dataset(read_jsonl(paths["train_dataset"]))
    eval_data = normalize_dataset(read_jsonl(paths["eval_dataset"]))
    chunks = read_jsonl(paths["chunks"])
    base_model = os.environ.get("CASTFORM_BASE_MODEL") or "Qwen/Qwen3.5-4B"
    serving_model = serving_base_model_id(base_model)
    num_epochs = int(os.environ.get("CASTFORM_NUM_EPOCHS", "5"))
    run_name = f"castgenie-{Path(args.project_root).name}"
    kwargs = trainer_kwargs()

    upload_kwargs: dict[str, Any] = {
        "env_class": env_class,
        "train_dataset": train_data,
        "eval_dataset": eval_data,
        "run_name": run_name,
        "constructor_args": {"chunks": chunks},
        "local_modules": local_modules,
        **kwargs,
    }
    uploaded = upload_training_run(**upload_kwargs)
    trainer = TrainerClient(**kwargs)
    launcher_args: dict[str, Any] = {
        "model": base_model,
        "num_epochs": num_epochs,
    }
    list_args = getattr(trainer, "list_launch_args", None)
    if callable(list_args):
        try:
            supported = set(str(item) for item in list_args())
            launcher_args = {
                key: value for key, value in launcher_args.items() if key in supported or not supported
            }
        except Exception:
            pass

    run_id = trainer.launch_training_run(
        training_run_type="simple",
        **object_to_kwargs(uploaded),
        launcher_args=launcher_args,
    )
    run_id = str(run_id)
    response(
        status="queued",
        castformRunId=run_id,
        statusUrl=f"https://app.castform.com/train/{run_id}",
        modelEndpoint=os.environ.get("CASTFORM_INFERENCE_BASE_URL", "https://llm.castform.com/v1"),
        modelName=f"ft:{serving_model}:{run_id}:latest",
        launchConfig={"runName": run_name, "baseModel": base_model, "numEpochs": num_epochs},
    )


def status(args: argparse.Namespace) -> None:
    require_workspace(Path(args.workspace))

    if not args.castform_run_id:
        raise RuntimeError("Missing Castform run id for status refresh")

    TrainerClient, _upload_training_run = import_benchmax()
    trainer = TrainerClient(**trainer_kwargs())
    status_value = "running"
    latest_message: str | None = None
    error_message: str | None = None
    error_count = 0

    for method_name in ["get_training_run", "retrieve_training_run", "get_run"]:
        method = getattr(trainer, method_name, None)
        if not callable(method):
            continue
        try:
            try:
                result = method(args.castform_run_id, include_config=False)
            except TypeError:
                result = method(args.castform_run_id)
            raw_status = getattr(result, "status", None)
            if isinstance(result, dict):
                raw_status = result.get("status")
                latest_message = result.get("latestEventMessage") or result.get("latestActivityMessage")
            if raw_status:
                status_value = str(raw_status).lower()
                break
        except Exception:
            continue

    details_method = getattr(trainer, "get_run_details", None)
    if callable(details_method):
        try:
            details = details_method(args.castform_run_id)
            if isinstance(details, dict):
                error_count = int(details.get("errorCount") or 0)
                latest_message = (
                    latest_message
                    or details.get("latestEventMessage")
                    or details.get("latestActivityMessage")
                )
        except Exception:
            pass

    if error_count > 0:
        logs_method = getattr(trainer, "get_environment_logs", None)
        if callable(logs_method):
            try:
                logs = logs_method(args.castform_run_id)
                if isinstance(logs, list) and logs:
                    latest_error = next(
                        (
                            item
                            for item in reversed(logs)
                            if isinstance(item, dict)
                            and str(item.get("level") or "").upper() == "ERROR"
                        ),
                        logs[-1],
                    )
                    if isinstance(latest_error, dict):
                        content = str(latest_error.get("content") or "").strip()
                        traceback = str(latest_error.get("traceback") or "").strip()
                        error_message = content or traceback[:1000] or f"Castform reported {error_count} environment error(s)."
            except Exception:
                error_message = f"Castform reported {error_count} environment error(s), but logs could not be retrieved."
        if not error_message:
            error_message = f"Castform reported {error_count} environment error(s)."

    complete_aliases = {"complete", "completed", "succeeded", "success", "finished", "hosted"}
    failed_aliases = {"failed", "error", "cancelled", "canceled"}
    normalized_status = (
        "complete"
        if status_value in complete_aliases
        else "failed"
        if status_value in failed_aliases or error_count > 0
        else "running"
    )
    base_model = os.environ.get("CASTFORM_BASE_MODEL") or "Qwen/Qwen3.5-4B"
    serving_model = serving_base_model_id(base_model)
    response(
        status=normalized_status,
        castformRunId=args.castform_run_id,
        statusUrl=f"https://app.castform.com/train/{args.castform_run_id}",
        modelEndpoint=os.environ.get("CASTFORM_INFERENCE_BASE_URL", "https://llm.castform.com/v1"),
        modelName=f"ft:{serving_model}:{args.castform_run_id}:latest",
        providerStatus=status_value,
        latestMessage=latest_message,
        error=error_message,
        errorCount=error_count,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["preflight", "validate", "launch", "status"])
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--castform-run-id")
    args = parser.parse_args()

    try:
        if args.operation == "preflight":
            preflight(args)
        elif args.operation == "validate":
            validate(args)
        elif args.operation == "launch":
            launch(args)
        else:
            status(args)
        return 0
    except Exception as exc:
        response(status="failed", error=str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())
