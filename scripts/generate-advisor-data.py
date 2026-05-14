#!/usr/bin/env python3
"""Generate normalized token advisor data from reviewed authored datasets."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
AUTHORED_DIR = ROOT / "data" / "authored"
GENERATED_DIR = ROOT / "data" / "generated"

COLOR_SOURCE = AUTHORED_DIR / "color-semantic.descriptions.json"
TYPOGRAPHY_SOURCE = AUTHORED_DIR / "typography-styles.descriptions.json"
COMPONENT_USAGE_SOURCE = AUTHORED_DIR / "component-usage.json"

STOP_WORDS = {
    "and",
    "any",
    "as",
    "be",
    "do",
    "does",
    "if",
    "in",
    "is",
    "its",
    "most",
    "of",
    "or",
    "than",
    "to",
    "are",
    "but",
    "for",
    "from",
    "into",
    "not",
    "only",
    "should",
    "that",
    "the",
    "this",
    "use",
    "when",
    "where",
    "with",
}


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def path_to_color_id(path: str) -> str:
    return "color." + path.replace("/", ".").replace(" ", "-")


def unique_terms(*values: Any) -> list[str]:
    terms: list[str] = []

    def add(value: Any) -> None:
        if value is None:
            return
        if isinstance(value, str):
            candidates = [value]
        elif isinstance(value, list):
            candidates = [item for item in value if isinstance(item, str)]
        else:
            return

        for candidate in candidates:
            normalized_candidate = candidate.strip().lower()
            parts = []
            if " " not in normalized_candidate and len(normalized_candidate) <= 64:
                parts.append(normalized_candidate)
            parts.extend(re.split(r"[/._\s-]+", normalized_candidate))
            for word in re.findall(r"[a-z0-9]+", normalized_candidate):
                if len(word) >= 3:
                    parts.append(word)
            for part in parts:
                normalized = re.sub(r"[^a-z0-9/-]+", "", part.strip())
                if normalized and normalized not in STOP_WORDS and normalized not in terms:
                    terms.append(normalized)

    for value in values:
        add(value)
    return terms


def validate_records(records: list[dict[str, Any]], source_name: str) -> None:
    seen: set[str] = set()
    for index, record in enumerate(records):
        record_id = record.get("id")
        if not record_id:
            raise ValueError(f"{source_name}[{index}] is missing id")
        if record_id in seen:
            raise ValueError(f"{source_name} has duplicate id: {record_id}")
        seen.add(record_id)
        if not record.get("description"):
            raise ValueError(f"{source_name} {record_id} is missing description")


def build_component_usage_indexes(
    usage_source: dict[str, Any],
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Build token-path indexes for component usage terms and phrases.

    ``componentTerms`` are tokenized keywords for broad matching.
    ``componentPhrases`` preserve authored phrases for high-precision matching.
    """
    terms_index: dict[str, list[str]] = {}
    phrases_index: dict[str, list[str]] = {}
    for component in usage_source.get("components", []):
        for usage in component.get("usages", []):
            phrases = [usage.get("element", "")] + usage.get("aliases", [])
            clean_phrases = [
                phrase.strip().lower()
                for phrase in phrases
                if isinstance(phrase, str) and phrase.strip()
            ]
            terms = unique_terms(*phrases)
            for token_path in usage.get("tokens", []):
                existing_terms = terms_index.setdefault(token_path, [])
                for term in terms:
                    if term not in existing_terms:
                        existing_terms.append(term)

                existing_phrases = phrases_index.setdefault(token_path, [])
                for phrase in clean_phrases:
                    if phrase not in existing_phrases:
                        existing_phrases.append(phrase)
    return terms_index, phrases_index


def build_color_records(
    source: dict[str, Any],
    component_terms_index: dict[str, list[str]] | None = None,
    component_phrases_index: dict[str, list[str]] | None = None,
) -> list[dict[str, Any]]:
    terms_index = component_terms_index or {}
    phrases_index = component_phrases_index or {}
    records: list[dict[str, Any]] = []
    for token in source["tokens"]:
        path = token["path"]
        category = path.split("/", 1)[0]
        record = {
            "id": path_to_color_id(path),
            "kind": "color",
            "category": category,
            "path": path,
            "description": token["description"],
            "notFor": token.get("notFor", []),
            "status": token.get("status"),
            "recommend": token.get("recommend", True),
            "figma": {
                "variableId": token.get("variableId"),
            },
            "modeValues": token.get("modeValues", {}),
            "searchTerms": unique_terms(path, category, token.get("description")),
            "componentTerms": terms_index.get(path, []),
            "componentPhrases": phrases_index.get(path, []),
        }
        records.append(record)
    validate_records(records, "colors")
    return records


def build_typography_records(
    source: dict[str, Any],
    component_terms_index: dict[str, list[str]] | None = None,
    component_phrases_index: dict[str, list[str]] | None = None,
) -> list[dict[str, Any]]:
    terms_index = component_terms_index or {}
    phrases_index = component_phrases_index or {}
    records: list[dict[str, Any]] = []
    for style in source["styles"]:
        path = style["figmaStylePath"]
        category = path.split("/", 1)[0]
        record = {
            "id": style["id"],
            "kind": "typography-style",
            "category": category,
            "path": path,
            "name": style["name"],
            "description": style["description"],
            "status": style.get("status"),
            "recommend": style.get("recommend", True),
            "figma": {
                "stylePath": path,
                "sourceVariableIds": style.get("sourceVariableIds", {}),
            },
            "css": {
                "var": style.get("cssVar"),
                "futureVar": style.get("futureCssVar"),
            },
            "properties": style.get("properties", {}),
            "searchTerms": unique_terms(
                style["id"],
                path,
                style.get("name"),
                style.get("cssVar"),
                style.get("futureCssVar"),
                style.get("description"),
            ),
            "componentTerms": terms_index.get(path, []),
            "componentPhrases": phrases_index.get(path, []),
        }
        records.append(record)
    validate_records(records, "typography")
    return records


def build_payload(
    colors: list[dict[str, Any]],
    typography: list[dict[str, Any]],
    included: list[str],
) -> dict[str, Any]:
    records = colors + typography
    return {
        "$schema": "https://via.mongodb.design/advisor-tokens.schema.json",
        "version": 1,
        "scope": {
            "included": included,
            "excluded": ["spacing", "size", "radius", "border width", "component construction tokens"],
        },
        "sourceFiles": {
            "colors": "data/authored/color-semantic.descriptions.json",
            "typography": "data/authored/typography-styles.descriptions.json",
        },
        "counts": {
            "total": len(records),
            "colors": len(colors),
            "typography": len(typography),
            "recommended": sum(1 for record in records if record["recommend"]),
            "notRecommended": sum(1 for record in records if not record["recommend"]),
        },
        "records": records,
    }


def annotate_tokens_css(
    css_path: Path,
    color_tokens: list[dict[str, Any]],
    typography_styles: list[dict[str, Any]],
) -> int:
    """Inject authored descriptions as inline CSS comments into tokens.css.

    Replaces any existing trailing comment on matched lines. Lines with no
    matching description are left unchanged.
    """
    lookup: dict[str, str] = {}

    for token in color_tokens:
        suffix = token["path"].replace("/", "-")
        desc = token["description"]
        lookup[f"--color-light-{suffix}"] = desc
        lookup[f"--color-dark-{suffix}"] = desc

    for style in typography_styles:
        css_var = style.get("cssVar")
        if css_var:
            lookup[css_var] = style["description"]

    raw = css_path.read_text(encoding="utf-8")
    lines = raw.splitlines(keepends=True)

    result: list[str] = []
    annotated = 0

    for line in lines:
        stripped = line.rstrip("\n\r")
        semi_idx = stripped.find(";")
        if semi_idx != -1:
            prop_part = stripped[:semi_idx + 1]
            colon_idx = prop_part.find(":")
            if colon_idx != -1:
                var_name = prop_part[:colon_idx].strip()
                if var_name.startswith("--") and var_name in lookup:
                    desc = lookup[var_name].replace("*/", "* /")
                    eol = "\n" if line.endswith("\n") else ""
                    result.append(f"{prop_part} /* {desc} */{eol}")
                    annotated += 1
                    continue
        result.append(line)

    css_path.write_text("".join(result), encoding="utf-8")
    return annotated


def main() -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)

    color_source = load_json(COLOR_SOURCE)
    typography_source = load_json(TYPOGRAPHY_SOURCE)

    component_terms_index: dict[str, list[str]] = {}
    component_phrases_index: dict[str, list[str]] = {}
    if COMPONENT_USAGE_SOURCE.exists():
        usage_source = load_json(COMPONENT_USAGE_SOURCE)
        component_terms_index, component_phrases_index = build_component_usage_indexes(usage_source)
        token_count = sum(1 for v in component_terms_index.values() if v)
        print(f"loaded component usage: {token_count} tokens with context terms")

    colors = build_color_records(color_source, component_terms_index, component_phrases_index)
    typography = build_typography_records(typography_source, component_terms_index, component_phrases_index)
    payload = build_payload(colors, typography, ["semantic color tokens", "typography styles"])

    write_json(GENERATED_DIR / "advisor-colors.json", build_payload(colors, [], ["semantic color tokens"]))
    write_json(GENERATED_DIR / "advisor-typography.json", build_payload([], typography, ["typography styles"]))
    write_json(GENERATED_DIR / "advisor-tokens.json", payload)

    print(
        "generated "
        f"{payload['counts']['total']} records "
        f"({payload['counts']['colors']} colors, {payload['counts']['typography']} typography)"
    )

    css_path = ROOT / "tokens.css"
    if css_path.exists():
        count = annotate_tokens_css(css_path, color_source["tokens"], typography_source["styles"])
        print(f"annotated {count} variables in tokens.css")


if __name__ == "__main__":
    main()
