"""Template Registry: loads and serves 50+ content templates."""

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent

CATEGORIES = [
    "matchday", "results", "transfers", "stats", "engagement",
    "stories", "academy", "champions_league", "merch", "behind_scenes",
]


class TemplateRegistry:
    _templates: dict[str, dict] = {}
    _loaded = False

    @classmethod
    def load(cls) -> None:
        """Load all templates from JSON files."""
        if cls._loaded:
            return
        for category in CATEGORIES:
            cat_dir = TEMPLATES_DIR / category
            if not cat_dir.exists():
                continue
            for f in sorted(cat_dir.glob("*.json")):
                try:
                    data = json.loads(f.read_text())
                    key = f"{category}/{f.stem}"
                    data["_key"] = key
                    data["_category"] = category
                    cls._templates[key] = data
                except Exception as e:
                    logger.warning("Failed to load template %s: %s", f, e)
        cls._loaded = True
        logger.info("Loaded %d templates across %d categories", len(cls._templates), len(CATEGORIES))

    @classmethod
    def get_all(cls) -> list[dict]:
        cls.load()
        return list(cls._templates.values())

    @classmethod
    def get_by_category(cls, category: str) -> list[dict]:
        cls.load()
        return [t for t in cls._templates.values() if t["_category"] == category]

    @classmethod
    def get(cls, key: str) -> Optional[dict]:
        cls.load()
        return cls._templates.get(key)

    @classmethod
    def get_by_platform(cls, platform: str) -> list[dict]:
        cls.load()
        return [t for t in cls._templates.values() if platform in t.get("platforms", [])]

    @classmethod
    def search(cls, query: str) -> list[dict]:
        cls.load()
        q = query.lower()
        return [t for t in cls._templates.values()
                if q in t.get("name", "").lower() or q in t.get("_category", "")]
