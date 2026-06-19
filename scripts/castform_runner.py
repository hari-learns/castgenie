#!/usr/bin/env python3
"""CastGenie Castform subprocess runner.

The Node app calls this script with fixed argument arrays. It emits JSON only
and never prints provider secrets.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import sys
from pathlib import Path
from typing import Any


def response(**kwargs: object) -> None:
    print(json.dumps(kwargs, separators=(",", ":")))


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
    chunks = workspace / "data" / "chunks.jsonl"
    corpus_manifest = workspace / "data" / "corpus_manifest.json"
    train_dataset = workspace / "train_dataset.jsonl"
    eval_dataset = workspace / "eval_dataset.jsonl"
    rag_readiness = workspace / "rag_readiness.json"
    reward_spec = workspace / "rewards" / "reward_spec.json"

    for path in [config, run_py, chunks, corpus_manifest, train_dataset, eval_dataset, rag_readiness, reward_spec]:
        if not path.exists():
            raise RuntimeError(f"Required Castform artifact is missing: {path.relative_to(workspace)}")

    return {
        "config": config,
        "run_py": run_py,
        "chunks": chunks,
        "corpus_manifest": corpus_manifest,
        "train_dataset": train_dataset,
        "eval_dataset": eval_dataset,
        "rag_readiness": rag_readiness,
        "reward_spec": reward_spec,
    }


def normalize_dataset(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows:
        prompt = row.get("question") or row.get("prompt")
        ground_truth = row.get("answer") or row.get("expectedAnswer") or row.get("ground_truth")
        if not prompt or not ground_truth:
            continue
        normalized.append(
            {
                "prompt": str(prompt),
                "ground_truth": str(ground_truth),
                "metadata": {
                    "id": row.get("id"),
                    "topic": row.get("topic"),
                    "reference_chunks": row.get("reference_chunks", []),
                    "sourceIds": row.get("sourceIds", []),
                    "chunkIds": row.get("chunkIds", []),
                    "difficulty": row.get("difficulty"),
                },
            }
        )

    if not normalized:
        raise RuntimeError("No trainable prompt/ground_truth rows were produced.")

    return normalized


def import_benchmax():
    try:
        from benchmax.envs.base_env import BaseEnv
        from benchmax.platform.client import TrainerClient
        from benchmax.platform.training_run import upload_training_run
    except Exception as exc:  # pragma: no cover - depends on optional local package
        raise RuntimeError("benchmax is not installed in the configured Python runtime") from exc

    return BaseEnv, TrainerClient, upload_training_run


def make_env_class():
    BaseEnv, _TrainerClient, _upload_training_run = import_benchmax()

    class CastGenieRagEnv(BaseEnv):  # type: ignore[misc, valid-type]
        system_prompt = (
            "Answer using the provided project corpus. Prefer source-grounded, "
            "specific answers. If the corpus is insufficient, say so clearly."
        )
        recommended_max_turns = 4

        async def list_tools(self):
            return []

        async def run_tool(self, rollout_id, tool_name, **tool_args):
            return {"error": f"Unknown tool: {tool_name}"}

        async def compute_reward(self, rollout_id, messages, task, **kwargs):
            output = ""
            if messages:
                last = messages[-1]
                if isinstance(last, dict):
                    output = str(last.get("content", ""))
                else:
                    output = str(getattr(last, "content", ""))

            ground_truth = str(task.get("ground_truth", ""))
            lowered = output.lower()
            truth_terms = [term for term in ground_truth.lower().split() if len(term) > 4]
            overlap = sum(1 for term in set(truth_terms[:40]) if term in lowered)
            validity = 1.0 if output.strip() and "source" in lowered or "chunk" in lowered else 0.5
            grounding = min(1.0, overlap / max(1, min(len(set(truth_terms)), 12)))
            return {"validity": validity, "grounding": grounding}

    return CastGenieRagEnv


def launch(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace)
    paths = require_workspace(workspace)
    api_key = os.environ.get("CASTFORM_API_KEY")
    base_url = os.environ.get("CASTFORM_BASE_URL")
    base_model = os.environ.get("CASTFORM_BASE_MODEL") or "Qwen/Qwen3.5-4B"

    if not api_key:
        raise RuntimeError("CASTFORM_API_KEY is not configured")
    _BaseEnv, TrainerClient, upload_training_run = import_benchmax()
    env_class = make_env_class()
    train_data = normalize_dataset(read_jsonl(paths["train_dataset"]))
    eval_data = normalize_dataset(read_jsonl(paths["eval_dataset"]))
    run_name = f"castgenie-{Path(args.project_root).name}"
    upload_kwargs: dict[str, Any] = {
        "env_class": env_class,
        "train_dataset": train_data,
        "eval_dataset": eval_data,
        "run_name": run_name,
        "api_key": api_key,
        "constructor_args": {},
    }
    if base_url and base_url != "your_castform_base_url_here":
        upload_kwargs["base_url"] = base_url

    uploaded = upload_training_run(**upload_kwargs)
    trainer_kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url and base_url != "your_castform_base_url_here":
        trainer_kwargs["base_url"] = base_url
    trainer = TrainerClient(**trainer_kwargs)
    run_id = trainer.launch_training_run(
        training_run_type="simple",
        **dataclasses.asdict(uploaded),
        launcher_args={
            "model": base_model,
            "num_epochs": int(os.environ.get("CASTFORM_NUM_EPOCHS", "5")),
        },
    )
    run_id = str(run_id)
    response(
        status="queued",
        castformRunId=run_id,
        statusUrl=f"https://app.castform.com/experiments/{run_id}",
        modelEndpoint=os.environ.get("CASTFORM_INFERENCE_BASE_URL", "https://llm.castform.com/v1"),
        modelName=f"ft:{base_model}:{run_id}:latest",
    )


def status(args: argparse.Namespace) -> None:
    require_workspace(Path(args.workspace))

    if not args.castform_run_id:
        raise RuntimeError("Missing Castform run id for status refresh")

    api_key = os.environ.get("CASTFORM_API_KEY")
    base_url = os.environ.get("CASTFORM_BASE_URL")
    if not api_key:
        raise RuntimeError("CASTFORM_API_KEY is not configured")

    _BaseEnv, TrainerClient, _upload_training_run = import_benchmax()
    trainer_kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url and base_url != "your_castform_base_url_here":
        trainer_kwargs["base_url"] = base_url
    trainer = TrainerClient(**trainer_kwargs)
    status_value = "running"
    for method_name in ["get_training_run", "retrieve_training_run", "get_run"]:
        method = getattr(trainer, method_name, None)
        if not callable(method):
            continue
        try:
            result = method(args.castform_run_id)
            raw_status = getattr(result, "status", None)
            if isinstance(result, dict):
                raw_status = result.get("status")
            if raw_status:
                status_value = str(raw_status).lower()
                break
        except Exception:
            continue

    complete_aliases = {"complete", "completed", "succeeded", "success", "finished"}
    failed_aliases = {"failed", "error", "cancelled", "canceled"}
    normalized_status = (
        "complete"
        if status_value in complete_aliases
        else "failed"
        if status_value in failed_aliases
        else "running"
    )
    base_model = os.environ.get("CASTFORM_BASE_MODEL") or "Qwen/Qwen3.5-4B"
    response(
        status=normalized_status,
        castformRunId=args.castform_run_id,
        statusUrl=f"https://app.castform.com/experiments/{args.castform_run_id}",
        modelEndpoint=os.environ.get("CASTFORM_INFERENCE_BASE_URL", "https://llm.castform.com/v1"),
        modelName=f"ft:{base_model}:{args.castform_run_id}:latest",
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
