"""Curated musical identities for the NASA EIC "Earth Jukebox" presets.

Each profile gives one visual dataset its own key, scale, tempo, register and
instrument palette, so the ten presets do not collapse into one D-Dorian
texture. A profile is a deterministic set of decisions, not a sound effect:
the image still decides pitch, duration, velocity and pan, and the profile
only decides the musical *language* those values are spoken in.

Instrument names are realised by ``src/preview/lib/scorePlayer.js``:

    lead   glass | bell | marimba | reed | pluck | flute | drone
    pad    warm | dark | airy | swell | haze | flow | air
    bass   deep | pulse | wood | sub
    perc   tick | ripple | zap | brush | knock | drop | thud | shimmer
    texture air | wind | haze | flow | glass

A missing instrument falls back to the role's default voice in the player, so
the contract is additive: older scores keep their original sound.
"""

from __future__ import annotations

from typing import Any

# One entry per curated frame. `id` matches the frontend preset `profile`.
IMAGE_PROFILES: dict[str, dict[str, Any]] = {
    "night-lights": {
        "label": "Night-light illuminance",
        "variable": "night-light brightness",
        "key": "A",
        "scale": "majorPentatonic",
        "tempo": 69,
        "register": 0,
        "lead": "glass",
        "pad": "warm",
        "bass": "deep",
        "perc": "tick",
        "texture": "air",
        "flash_threshold": 0.40,
        "edge_threshold": 0.62,
        "min_transients": 0,
        "perc_per_bar": 2,
        "visual": "a left-to-right sweep of the city lights",
        "rise": "brighter metropolitan cores raise pitch and add glass arpeggio notes",
        "fall": "dark oceans and wilderness leave rests instead of quiet notes",
        "accent": "an isolated bright cluster adds a tick",
        "legend_note": "colour-ramp position from ocean void to mega-cluster",
    },
    "ocean-thermal": {
        "label": "Sea-surface temperature gradient",
        "variable": "thermal colour-ramp position",
        "key": "D",
        "scale": "dorian",
        "tempo": 66,
        "register": 0,
        "lead": "flute",
        "pad": "flow",
        "bass": "deep",
        "perc": "ripple",
        "texture": "flow",
        "flash_threshold": 0.55,
        "edge_threshold": 0.70,
        "min_transients": 0,
        "perc_per_bar": 2,
        "visual": "a left-to-right sweep across the global ocean",
        "rise": "warm tropical water lifts the flute and widens the pad",
        "fall": "cold polar water settles into the lower register",
        "accent": "a sharp current edge adds a water ripple",
        "legend_note": "colour-ramp position from polar cold to equatorial warm",
    },
    "lightning": {
        "label": "Optical lightning flash intensity",
        "variable": "flash luminance above the local baseline",
        "key": "F#",
        "scale": "phrygian",
        "tempo": 61,
        "register": 12,
        "lead": "bell",
        "pad": "dark",
        "bass": "pulse",
        "perc": "zap",
        "texture": "wind",
        "flash_threshold": 0.16,
        "edge_threshold": 0.62,
        "min_transients": 6,
        "perc_per_bar": 4,
        "visual": "a centre-outward radial sweep",
        "rise": "a brighter flash pushes the bell higher and louder",
        "fall": "the storm background holds a low dark pad",
        "accent": "the strongest flashes fire a transient zap",
        "legend_note": "colour-ramp position from calm void to optical flash burst",
    },
    "aerosols": {
        "label": "Aerosol plume colour",
        "variable": "plume colour-ramp position",
        "key": "G",
        "scale": "dorian",
        "tempo": 70,
        "register": 0,
        "lead": "reed",
        "pad": "airy",
        "bass": "wood",
        "perc": "brush",
        "texture": "haze",
        "flash_threshold": 0.42,
        "edge_threshold": 0.52,
        "min_transients": 0,
        "perc_per_bar": 3,
        "visual": "eight spatial tiles, each read as its own voice",
        "rise": "dense dust and smoke push the reed upward",
        "fall": "clean air thins the texture to a quiet pad",
        "accent": "a plume edge sweeps a brush hit across the stereo field",
        "legend_note": "colour-ramp position from clean air to volcanic sulfate",
    },
    "canopy": {
        "label": "Canopy height",
        "variable": "canopy colour-ramp position",
        "key": "C",
        "scale": "majorPentatonic",
        "tempo": 63,
        "register": 0,
        "lead": "marimba",
        "pad": "swell",
        "bass": "wood",
        "perc": "knock",
        "texture": "air",
        "flash_threshold": 0.45,
        "edge_threshold": 0.55,
        "min_transients": 0,
        "perc_per_bar": 3,
        "visual": "a left-to-right sweep across the forest map",
        "rise": "tall emergent canopy lifts the marimba register",
        "fall": "bare ground drops to the root and rests",
        "accent": "a sharp canopy edge adds a wooden knock",
        "legend_note": "colour-ramp position from bare ground to emergent giant",
    },
    "river": {
        "label": "Atmospheric-river moisture",
        "variable": "moisture colour-ramp position",
        "key": "A",
        "scale": "dorian",
        "tempo": 62,
        "register": 0,
        "lead": "pluck",
        "pad": "swell",
        "bass": "deep",
        "perc": "drop",
        "texture": "flow",
        "flash_threshold": 0.38,
        "edge_threshold": 0.60,
        "min_transients": 0,
        "perc_per_bar": 3,
        "visual": "a left-to-right sweep through the vapour plume",
        "rise": "a saturated plume lifts the pluck and swells the pad",
        "fall": "dry air narrows the filter and thins the texture",
        "accent": "a torrential core adds a low water drop",
        "legend_note": "colour-ramp position from dry atmosphere to torrential saturation",
    },
    "co2": {
        "label": "Carbon-dioxide concentration",
        "variable": "CO₂ colour-ramp position",
        "key": "C",
        "scale": "minor",
        "tempo": 58,
        "register": -12,
        "lead": "drone",
        "pad": "dark",
        "bass": "sub",
        "perc": "thud",
        "texture": "haze",
        "flash_threshold": 0.50,
        "edge_threshold": 0.66,
        "min_transients": 0,
        "perc_per_bar": 2,
        "visual": "a slow left-to-right sweep of the concentration field",
        "rise": "a high-emission plume pulls the drone upward and adds tension",
        "fall": "ocean sinks settle into the sub-bass",
        "accent": "a sharp concentration front adds a low thud",
        "legend_note": "colour-ramp position from ocean sink to high emission",
    },
    "air-quality": {
        "label": "Fine particulate matter",
        "variable": "PM2.5 colour-ramp position",
        "key": "G",
        "scale": "phrygian",
        "tempo": 72,
        "register": 0,
        "lead": "reed",
        "pad": "haze",
        "bass": "pulse",
        "perc": "tick",
        "texture": "haze",
        "flash_threshold": 0.35,
        "edge_threshold": 0.50,
        "min_transients": 0,
        "perc_per_bar": 4,
        "visual": "eight spatial tiles, each read as its own voice",
        "rise": "hazardous particulate lifts the reed into a tense register",
        "fall": "pristine air relaxes the pad and clears the texture",
        "accent": "a sharp plume boundary adds a dry tick",
        "legend_note": "colour-ramp position from pristine air to hazardous PM2.5",
    },
    "currents": {
        "label": "Boundary-current velocity",
        "variable": "velocity colour-ramp position",
        "key": "D",
        "scale": "majorPentatonic",
        "tempo": 64,
        "register": 12,
        "lead": "glass",
        "pad": "flow",
        "bass": "deep",
        "perc": "ripple",
        "texture": "flow",
        "flash_threshold": 0.40,
        "edge_threshold": 0.58,
        "min_transients": 0,
        "perc_per_bar": 3,
        "visual": "a left-to-right sweep following the current",
        "rise": "a fast jet lifts the glass arpeggio and pans it across the field",
        "fall": "abyssal calm leaves the pad alone",
        "accent": "a meander edge adds a stereo ripple",
        "legend_note": "colour-ramp position from abyssal calm to high-velocity jet",
    },
    "astral": {
        "label": "Stellar brightness",
        "variable": "luminance-ramp position",
        "key": "E",
        "scale": "phrygian",
        "tempo": 67,
        "register": 0,
        "lead": "bell",
        "pad": "air",
        "bass": "sub",
        "perc": "shimmer",
        "texture": "glass",
        "flash_threshold": 0.42,
        "edge_threshold": 0.60,
        "min_transients": 0,
        "perc_per_bar": 3,
        "visual": "a left-to-right sweep across the nebula",
        "rise": "a bright core lifts the bell and opens the air pad",
        "fall": "deep space falls back to the sub-bass",
        "accent": "a stellar edge adds a shimmer",
        "legend_note": "luminance-ramp position from vacuum to central core",
    },
}

LEAD_INSTRUMENTS = frozenset({"glass", "bell", "marimba", "reed", "pluck", "flute", "drone"})
PAD_INSTRUMENTS = frozenset({"warm", "dark", "airy", "swell", "haze", "flow", "air"})
BASS_INSTRUMENTS = frozenset({"deep", "pulse", "wood", "sub"})
PERC_INSTRUMENTS = frozenset({"tick", "ripple", "zap", "brush", "knock", "drop", "thud", "shimmer"})
TEXTURE_INSTRUMENTS = frozenset({"air", "wind", "haze", "flow", "glass"})


def get_image_profile(profile_id: str | None) -> dict[str, Any] | None:
    """Return a copy of a curated profile, or ``None`` for an unknown id."""
    if not profile_id:
        return None
    profile = IMAGE_PROFILES.get(profile_id)
    if profile is None:
        return None
    resolved = dict(profile)
    resolved["id"] = profile_id
    return resolved


def available_profiles() -> list[str]:
    return sorted(IMAGE_PROFILES)


def instrument_for(profile: dict[str, Any] | None, role: str) -> str | None:
    """The profile's instrument for a role, validated against the player."""
    if not profile:
        return None
    table = {
        "lead": LEAD_INSTRUMENTS,
        "pad": PAD_INSTRUMENTS,
        "bass": BASS_INSTRUMENTS,
        "perc": PERC_INSTRUMENTS,
        "texture": TEXTURE_INSTRUMENTS,
    }
    name = profile.get(role)
    return name if name in table.get(role, frozenset()) else None


__all__ = [
    "BASS_INSTRUMENTS",
    "IMAGE_PROFILES",
    "LEAD_INSTRUMENTS",
    "PAD_INSTRUMENTS",
    "PERC_INSTRUMENTS",
    "TEXTURE_INSTRUMENTS",
    "available_profiles",
    "get_image_profile",
    "instrument_for",
]
