#!/usr/bin/env python3
"""Reduce a complete REA IL2CPP Evidence JSON into small, actionable artifacts.

REA's complete IL2CPP Evidence for a real game is several megabytes. The mod menu
only needs a handful of facts: which types/fields/methods look like game state,
and the arm64 RVAs of their methods so Frida can hook `libil2cpp.so + rva`.

Usage: rea_reduce.py <evidence.json> <out_dir>
"""

from __future__ import annotations

import json
import pathlib
import sys

# Alan/oyun durumu icin anlamli olabilecek anahtar kelimeler (kucuk harfle eslesir).
KEYWORDS = (
    "money",
    "cash",
    "budget",
    "finance",
    "financial",
    "transfer",
    "wage",
    "salary",
    "contract",
    "player",
    "squad",
    "club",
    "team",
    "stadium",
    "reputation",
    "rating",
    "ability",
    "attribute",
    "potential",
    "youth",
    "scout",
    "season",
    "league",
    "table",
    "match",
    "result",
    "save",
    "load",
    "currency",
    "purchase",
    "upgrade",
    "unlock",
    "premium",
    "gem",
    "coin",
    "ad",
    "reward",
    "energy",
)


def find_metadata(node: object) -> dict | None:
    """Depth-first search for the decoded metadata object."""
    stack = [node]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            if isinstance(cur.get("types"), list) and isinstance(cur.get("methods"), list):
                return cur
            stack.extend(reversed(list(cur.values())))
        elif isinstance(cur, list):
            stack.extend(reversed(cur))
    return None


def hit(text: object) -> bool:
    return isinstance(text, str) and any(k in text.lower() for k in KEYWORDS)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    evidence_path = pathlib.Path(sys.argv[1])
    out_dir = pathlib.Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(evidence_path.read_text(encoding="utf-8"))
    meta = find_metadata(data)
    if meta is None:
        (out_dir / "il2cpp-ERROR.txt").write_text(
            "Decoded IL2CPP metadata object not found in the evidence file.\n"
            "Top-level keys: " + ", ".join(sorted(map(str, data.keys() if isinstance(data, dict) else []))),
            encoding="utf-8",
        )
        return 1

    types = meta.get("types") or []
    methods = meta.get("methods") or []
    fields = meta.get("fields") or []
    props = meta.get("properties") or []
    literals = meta.get("string_literals") or []
    addrs = meta.get("method_addresses") or []
    images = meta.get("images") or []
    counts = meta.get("counts") or {}

    # method index -> address row
    addr_by_index = {row.get("index"): row for row in addrs if isinstance(row, dict)}

    # Build owner lookups. declaring_type is a type index.
    methods_by_type: dict[int, list[dict]] = {}
    for m in methods:
        methods_by_type.setdefault(m.get("declaring_type"), []).append(m)
    fields_by_type: dict[int, list[dict]] = {}
    for f in fields:
        fields_by_type.setdefault(f.get("declaring_type"), []).append(f)
    props_by_type: dict[int, list[dict]] = {}
    for p in props:
        props_by_type.setdefault(p.get("declaring_type"), []).append(p)

    summary = {
        "metadata_version": meta.get("metadata_version"),
        "index_widths": meta.get("index_widths"),
        "counts": counts,
        "images": [{"name": i.get("name"), "type_count": i.get("type_count")} for i in images],
        "binary": meta.get("binary"),
        "artifact": meta.get("artifact"),
        "limitations": meta.get("limitations"),
    }
    (out_dir / "il2cpp-summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    interest = []
    for t in types:
        name = t.get("name") or ""
        ns = t.get("namespace") or ""
        full = f"{ns}.{name}" if ns else name
        membership = methods_by_type.get(t.get("index"), [])
        named_hit = hit(full)
        members_hit = [m for m in membership if hit(m.get("name"))]
        fld_hit = [f for f in fields_by_type.get(t.get("index"), []) if hit(f.get("name"))]
        if not (named_hit or members_hit or fld_hit):
            continue
        methods_out = []
        for m in membership:
            row = addr_by_index.get(m.get("index")) or {}
            methods_out.append(
                {
                    "name": m.get("name"),
                    "index": m.get("index"),
                    "state": row.get("state"),
                    "rva": row.get("rva"),
                    "address": row.get("address"),
                }
            )
        interest.append(
            {
                "type_index": t.get("index"),
                "type": full,
                "namespace": ns,
                "methods": methods_out[:120],
                "fields": [f.get("name") for f in fields_by_type.get(t.get("index"), [])][:80],
                "properties": [p.get("name") for p in props_by_type.get(t.get("index"), [])][:80],
            }
        )

    interest.sort(key=lambda item: (-len(item["methods"]), item["type"]))
    (out_dir / "types-of-interest.json").write_text(
        json.dumps(interest[:400], indent=2, ensure_ascii=False), encoding="utf-8"
    )

    hooks = []
    for t in interest:
        for m in t["methods"]:
            if m.get("state") == "code" and m.get("rva"):
                hooks.append(f"{t['type']}::{m['name']},{m['rva']},{m['address']}")
    hooks = sorted(set(hooks))
    (out_dir / "hooks.csv").write_text("symbol,rva,address\n" + "\n".join(hooks) + "\n", encoding="utf-8")

    strings = []
    for lit in literals:
        value = lit.get("value")
        if hit(value):
            strings.append(value if isinstance(value, str) else "")
    unique_strings = sorted({s for s in strings if s})
    (out_dir / "strings-of-interest.txt").write_text(
        "\n".join(unique_strings[:3000]) + "\n", encoding="utf-8"
    )

    print(f"metadata_version={summary['metadata_version']}")
    print(f"counts={json.dumps(counts)}")
    print(f"types_of_interest={len(interest)} hooks={len(hooks)} strings={len(unique_strings)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
