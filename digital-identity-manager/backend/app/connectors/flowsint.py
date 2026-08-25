"""Flowsint bridge.

Flowsint (https://github.com/reconurge/flowsint, Apache-2.0) is a graph based
OSINT investigation platform that keeps its **own** datastores (PostgreSQL,
Redis, Neo4j) exactly as documented upstream. This lab never writes into them:
PostgreSQL here stays the single source of truth for the inventory.

The bridge simply exports the identity graph to neutral ``nodes``/``edges``
files that can be imported into Flowsint (or any other graph tool).
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from app.config import get_settings


def build_export(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "format": "dim-graph/1",
        "source": "digital-identity-manager",
        "nodes": nodes,
        "edges": edges,
    }


def write_export(
    identity_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    output_dir: str | None = None,
) -> dict[str, str]:
    """Write ``graph.json`` plus ``nodes.csv`` / ``edges.csv`` and return paths."""
    settings = get_settings()
    base = output_dir or settings.flowsint_export_dir
    if base:
        directory = Path(base) / identity_id
    else:
        directory = Path(settings.reports_dir) / "flowsint" / identity_id
    directory.mkdir(parents=True, exist_ok=True)

    graph_path = directory / "graph.json"
    graph_path.write_text(
        json.dumps(build_export(nodes, edges), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    nodes_path = directory / "nodes.csv"
    with nodes_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "type", "label", "sublabel"])
        writer.writeheader()
        for node in nodes:
            writer.writerow({key: node.get(key) for key in writer.fieldnames})

    edges_path = directory / "edges.csv"
    with edges_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle, fieldnames=["id", "source", "target", "type", "status", "confidence"]
        )
        writer.writeheader()
        for edge in edges:
            writer.writerow({key: edge.get(key) for key in writer.fieldnames})

    return {
        "graph_json": str(graph_path),
        "nodes_csv": str(nodes_path),
        "edges_csv": str(edges_path),
    }
