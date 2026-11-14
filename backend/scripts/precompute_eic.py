"""Regenerate the checked-in Earth Jukebox scores.

Run from ``backend/``:

    python scripts/precompute_eic.py

Each entry is the same envelope ``POST /api/sonify/image`` returns, so the
player cannot tell a precomputed score from a live one. The frames live in
``public/images/eic``; the options mirror ``src/preview/data/eicPresets.js``
(scan, grid and legend). Keep those two tables in sync when a preset changes.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sonify.image_sonifier import build_image_score
from sonify.models import ImageOptions

ROOT = Path(__file__).resolve().parents[2]
IMAGES = ROOT / "public" / "images" / "eic"
OUTPUT = ROOT / "src" / "preview" / "data" / "eicPrecomputedScores.json"

# (preset id, frame, scan, grid, legend)
PRESETS = [
    (
        "svs-5313",
        "nightlights.jpg",
        "columns",
        6,
        ["#020408", "#1c140a", "#7c4a1e", "#e5a93b", "#ffffff"],
    ),
    (
        "svs-3912",
        "sea-surface-temp.jpg",
        "columns",
        6,
        ["#082046", "#157a8a", "#41b6c4", "#8fbc34", "#d73027"],
    ),
    (
        "svs-5011",
        "iss-lightning.jpg",
        "radial",
        6,
        ["#020205", "#0e0826", "#2d1b69", "#7251b8", "#ffffff"],
    ),
    (
        "svs-5669",
        "geos-aerosols.jpg",
        "regions",
        8,
        ["#000000", "#1f77b4", "#ff7f0e", "#d62728", "#f0f0f0"],
    ),
    (
        "svs-4950",
        "gedi-canopy-height.jpg",
        "columns",
        6,
        ["#2e0840", "#452264", "#7a8822", "#2ca25f", "#00e5ff"],
    ),
    (
        "svs-4960",
        "atmospheric-river.jpg",
        "columns",
        6,
        ["#060c18", "#122648", "#2c6ca8", "#61b3e8", "#ffecb3"],
    ),
    (
        "svs-5196",
        "dyamond-co2.jpg",
        "columns",
        6,
        ["#1a3350", "#2c5f85", "#5c9472", "#c49234", "#d94e28"],
    ),
    (
        "svs-5533",
        "air-quality.jpg",
        "regions",
        8,
        ["#000000", "#194a28", "#8aa834", "#f4d03f", "#b03a2e"],
    ),
    (
        "svs-5425",
        "perpetual-ocean.jpg",
        "columns",
        6,
        ["#050812", "#0f2042", "#1a5286", "#3d9ed2", "#ffe680"],
    ),
    (
        "svs-13786",
        "caldwell-73.jpg",
        "columns",
        6,
        ["#020206", "#141432", "#3a4078", "#7898d0", "#ffffff"],
    ),
]

# The musical identity belongs to the frame, not to this script.
PROFILE_BY_PRESET = {
    "svs-5313": "night-lights",
    "svs-3912": "ocean-thermal",
    "svs-5011": "lightning",
    "svs-5669": "aerosols",
    "svs-4950": "canopy",
    "svs-4960": "river",
    "svs-5196": "co2",
    "svs-5533": "air-quality",
    "svs-5425": "currents",
    "svs-13786": "astral",
}


def build_entry(preset_id: str, frame: str, scan: str, grid: int, legend: list[str]) -> dict:
    data = (IMAGES / frame).read_bytes()
    options = ImageOptions(
        scan=scan,
        grid=grid,
        legend=legend,
        profile=PROFILE_BY_PRESET[preset_id],
    )
    raw, musical, summary = build_image_score(data, options)
    return {
        "version": "1.0",
        "source": raw.source.model_dump(),
        "musical_score": musical.model_dump(),
        "cache": {"hit": False, "key": raw.source.id},
        "analysis": summary,
    }


def main() -> None:
    scores = {
        preset_id: build_entry(preset_id, frame, scan, grid, legend)
        for preset_id, frame, scan, grid, legend in PRESETS
    }
    OUTPUT.write_text(json.dumps(scores, indent=2) + "\n", encoding="utf-8")

    for preset_id, entry in scores.items():
        score = entry["musical_score"]
        perc = next((track for track in score["tracks"] if track["role"] == "perc"), None)
        leads = [track for track in score["tracks"] if track["role"] == "lead"]
        print(
            f"{preset_id}: {score['key']} {score['scale']} {score['tempo_bpm']} bpm · "
            f"{len(leads)} lead voice(s) · {len(perc['notes']) if perc else 0} percussion · "
            f"{entry['analysis']['transients']} transients · {OUTPUT.name}"
        )


if __name__ == "__main__":
    main()
