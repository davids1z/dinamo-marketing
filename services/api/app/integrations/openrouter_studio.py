"""OpenRouter AI scene generation for Content Studio using Gemini 2.5 Pro."""

import json
import logging

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

STUDIO_SYSTEM_PROMPT = """Ti si AI kreativni direktor za GNK Dinamo Zagreb — vodeći hrvatski nogometni klub.

TVOJ ZADATAK:
Generiraš strukturirane scene-by-scene vizualne sadržaje (reels, videe, plakate) za društvene mreže.
Output je JSON koji frontend koristi za live preview s CSS animacijama.

BRANDING:
- Boje: Plava (#0057A8), Tamna (#0A1A28), Accent (#B8FF00), Bijela (#FFFFFF)
- Font naslova: "Tektur" — heavy, uppercase, športski
- Font tijela: "Inter" — čist, čitljiv
- Stil: profesionalan, dinamičan, ponosan, navijački

PRAVILA ZA SCENE:
1. Svaka scena traje 2-5 sekundi
2. Pozicije (x, y) su u postocima (0-100) za responsive rendering
3. Koristi bold gradijente klupskih boja za pozadine
4. Text mora biti na HRVATSKOM jeziku
5. Animacije: fade_in, slide_up, slide_down, slide_left, slide_right, scale_up, scale_down, typewriter, bounce, pulse, blur_in
6. Tranzicije između scena: fade, slide_left, slide_up, zoom_in, zoom_out, none
7. Maksimalno 3 text layera po sceni
8. Uvijek dodaj Dinamo logo overlay na barem jednu scenu

TIPOVI POZADINA:
- gradient: { "type": "gradient", "colors": ["#0A1A28", "#0057A8"], "direction": "to bottom right" }
- color: { "type": "color", "color": "#0A1A28" }
- image: { "type": "image", "src": "uploaded_image_url", "overlay_opacity": 0.6, "overlay_color": "#0A1A28" }

DOSTUPNE ANIMACIJE ZA TEXT:
- fade_in: jednostavno pojavljivanje
- slide_up: klizi odozdo prema gore
- slide_down: klizi odozgo prema dolje
- slide_left: klizi s desna na lijevo
- slide_right: klizi s lijeva na desno
- scale_up: raste od malog do normalnog
- scale_down: smanjuje se
- typewriter: slovo po slovo
- bounce: odskakuje
- pulse: pulsira
- blur_in: od mutnog do oštrog

OUTPUT FORMAT (samo JSON, bez teksta):
{
  "scenes": [
    {
      "id": "scene_1",
      "order": 1,
      "duration": 3.0,
      "background": { "type": "gradient", "colors": ["#0A1A28", "#0057A8"], "direction": "to bottom" },
      "text_layers": [
        {
          "id": "text_1",
          "text": "MATCHDAY",
          "position": { "x": 50, "y": 40 },
          "font_size": 72,
          "font_family": "Tektur",
          "font_weight": "800",
          "color": "#B8FF00",
          "text_align": "center",
          "animation": "scale_up",
          "animation_delay": 0.0
        }
      ],
      "overlay_layers": [
        {
          "id": "overlay_1",
          "type": "logo",
          "src": "/assets/dinamo-crest.svg",
          "position": { "x": 50, "y": 15 },
          "size": 80,
          "animation": "fade_in",
          "animation_delay": 0.2
        }
      ],
      "transition": "fade"
    }
  ],
  "caption": "Hrvatski tekst opisa za objavu...",
  "hashtags": ["#Dinamo", "#GNKDinamo", "#Modri", "#HNL"],
  "description": "Kratki opis za SEO / alt text",
  "total_duration": 15.0,
  "aspect_ratio": "9:16"
}"""


def _build_user_prompt(
    brief: str,
    post_title: str,
    platform: str,
    content_type: str,
    media_descriptions: list[str] | None = None,
) -> str:
    """Build the user prompt for scene generation."""
    aspect_map = {
        "instagram": "9:16 (1080×1920) za Reel/Story ili 1:1 (1080×1080) za Post",
        "tiktok": "9:16 (1080×1920)",
        "youtube": "16:9 (1920×1080) za Video ili 9:16 za Shorts",
        "facebook": "1:1 (1080×1080) ili 16:9 (1920×1080)",
    }

    aspect = aspect_map.get(platform.lower(), "9:16 (1080×1920)")

    media_section = ""
    if media_descriptions:
        media_list = "\n".join(f"  - {m}" for m in media_descriptions)
        media_section = f"\n\nDOSTUPNI MEDIJI (koristi ih kao pozadine scena):\n{media_list}"

    return f"""Generiraj scene za sljedeći sadržaj:

NASLOV: {post_title}
PLATFORMA: {platform}
TIP: {content_type}
ASPEKT: {aspect}

BRIEF OD ADMINA:
{brief}
{media_section}

ZAHTJEVI:
- Generiraj 3-6 scena ovisno o tipu sadržaja
- Za reels/video: 3-5 scena po 2-4 sekunde
- Za plakat/post: 1-2 scene
- Animacije moraju biti dinamične i profesionalne
- Caption i hashtagovi moraju biti na hrvatskom
- Opis mora biti SEO-friendly

SAMO JSON output, bez dodatnog teksta."""


async def generate_studio_scenes(
    api_key: str,
    brief: str,
    post_title: str,
    platform: str,
    content_type: str,
    media_descriptions: list[str] | None = None,
) -> dict:
    """Call OpenRouter (Gemini 2.5 Pro) to generate structured scene data.

    Returns dict with keys: scenes, caption, hashtags, description, total_duration, aspect_ratio
    """
    user_prompt = _build_user_prompt(
        brief=brief,
        post_title=post_title,
        platform=platform,
        content_type=content_type,
        media_descriptions=media_descriptions,
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dinamo.xyler.ai",
        "X-Title": "Dinamo Content Studio",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": STUDIO_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 8000,
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    logger.info("Studio AI response length: %d chars", len(content))

    result = _parse_studio_response(content)
    logger.info("Generated %d scenes, total duration: %.1fs", len(result.get("scenes", [])), result.get("total_duration", 0))
    return result


def _parse_studio_response(content: str) -> dict:
    """Parse AI response into structured scene data."""
    import re

    content = content.strip()

    # Strip markdown fences
    if content.startswith("```"):
        first_nl = content.index("\n")
        content = content[first_nl + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Fix common JSON issues
    content = _fix_json(content)

    # Try direct parse
    try:
        result = json.loads(content)
        return _validate_scene_data(result)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1:
        json_str = content[start:end + 1]
        try:
            result = json.loads(json_str)
            return _validate_scene_data(result)
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse studio AI response")
    logger.error("First 500 chars: %s", content[:500])
    raise ValueError("Could not parse AI scene generation response as JSON")


def _validate_scene_data(data: dict) -> dict:
    """Validate and normalize the scene data structure."""
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object for scene data")

    # Ensure required keys exist with defaults
    result = {
        "scenes": data.get("scenes", []),
        "caption": data.get("caption", ""),
        "hashtags": data.get("hashtags", []),
        "description": data.get("description", ""),
        "total_duration": data.get("total_duration", 0),
        "aspect_ratio": data.get("aspect_ratio", "9:16"),
    }

    if not result["scenes"]:
        raise ValueError("AI generated empty scenes array")

    # Normalize scenes
    for i, scene in enumerate(result["scenes"]):
        scene.setdefault("id", f"scene_{i + 1}")
        scene.setdefault("order", i + 1)
        scene.setdefault("duration", 3.0)
        scene.setdefault("background", {"type": "gradient", "colors": ["#0A1A28", "#0057A8"], "direction": "to bottom"})
        scene.setdefault("text_layers", [])
        scene.setdefault("overlay_layers", [])
        scene.setdefault("transition", "fade")

        # Normalize text layers
        for j, tl in enumerate(scene["text_layers"]):
            tl.setdefault("id", f"text_{i + 1}_{j + 1}")
            tl.setdefault("position", {"x": 50, "y": 50})
            tl.setdefault("font_size", 48)
            tl.setdefault("font_family", "Tektur")
            tl.setdefault("font_weight", "700")
            tl.setdefault("color", "#FFFFFF")
            tl.setdefault("text_align", "center")
            tl.setdefault("animation", "fade_in")
            tl.setdefault("animation_delay", 0.0)

        # Normalize overlay layers
        for j, ol in enumerate(scene["overlay_layers"]):
            ol.setdefault("id", f"overlay_{i + 1}_{j + 1}")
            ol.setdefault("position", {"x": 50, "y": 50})
            ol.setdefault("size", 60)
            ol.setdefault("animation", "fade_in")
            ol.setdefault("animation_delay", 0.0)

    # Calculate total duration if not provided
    if not result["total_duration"]:
        result["total_duration"] = sum(s["duration"] for s in result["scenes"])

    return result


def _fix_json(s: str) -> str:
    """Fix common JSON issues from LLM output."""
    import re
    s = re.sub(r',\s*([}\]])', r'\1', s)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    return s
