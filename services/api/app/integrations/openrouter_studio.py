"""OpenRouter AI scene generation for Content Studio using Gemini 2.5 Pro.

ShiftOneZero Marketing Platform
"""

import json
import json as _json
import logging

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"


def _build_studio_brand_section(client=None) -> str:
    """Build the branding section of the studio prompt from client context."""
    if client is None:
        return """BOJE:
- Brand Primary: #0057A8 (primarna)
- Tamno / Noć: #0A1A28 (pozadine, kontrast)
- Neon Zelena / Accent: #B8FF00 (CTA, naglasci, energija — moderne kampanje)
- Bijela: #FFFFFF (tekst na tamnim pozadinama)
- Zlatna: #FFD700 (za specijalne prilike)

TIPOGRAFIJA:
- Font naslova: "Tektur" — heavy, uppercase, dinamičan
- Font tijela: "Inter" — čist, moderan, čitljiv
- Uvijek UPPERCASE za naslove i ključne poruke
- Bold je defaultni weight za naslove (700-800)

STIL KOMUNIKACIJE:
- Profesionalizam — moderno, čisto, premium
- Energija i dinamika — aktivan, pozitivan ton
- Hrvatski jezik — jasna i pristupačna komunikacija
- Hashtags: #DemoBrand #OurBrand + specifični za kampanju

TON SADRŽAJA PO TIPU:
- Lansiranje: Intenzivan, uzbudljiv ("NOVO! OTKRIJTE SADA!")
- Proizvod: Informativan, profesionalan
- Tim/ljudi: Topao, autentičan, inspirativan
- Kampanja: Energičan, poziv na akciju
- Throwback: Nostalgičan, priča o brendu"""

    colors = client.brand_colors or {}
    fonts = client.brand_fonts or {}
    hashtags = ", ".join(client.hashtags or [])
    languages = ", ".join(client.languages or ["hr"])
    tone = client.tone_of_voice or "Profesionalan, moderan"

    color_lines = "\n".join(f"- {k}: {v}" for k, v in colors.items()) or "- (koristi default boje)"
    font_lines = ""
    if fonts:
        font_lines = "\n".join(f"- {k}: {v}" for k, v in fonts.items())
    else:
        font_lines = '- Font naslova: "Tektur" — heavy, uppercase, dinamičan\n- Font tijela: "Inter" — čist, moderan, čitljiv'

    return f"""BOJE:
{color_lines}
- Bijela: #FFFFFF (tekst na tamnim pozadinama)
- Zlatna: #FFD700 (za specijalne prilike)

TIPOGRAFIJA:
{font_lines}
- Uvijek UPPERCASE za naslove i ključne poruke
- Bold je defaultni weight za naslove (700-800)

STIL KOMUNIKACIJE:
- Ton: {tone}
- Jezici: {languages}
- Hashtags: {hashtags or '#Brand + specifični za kampanju'}

TON SADRŽAJA PO TIPU:
- Lansiranje: Intenzivan, uzbudljiv ("NOVO! OTKRIJTE SADA!")
- Proizvod: Informativan, profesionalan
- Tim/ljudi: Topao, autentičan, inspirativan
- Kampanja: Energičan, poziv na akciju
- Throwback: Nostalgičan, priča o brendu"""


def _build_studio_system_prompt(client=None) -> str:
    """Build the complete studio system prompt, optionally with client brand context."""
    brand_name = f'brenda "{client.name}"' if client else "marketinske platforme"
    brand_section = _build_studio_brand_section(client)

    return f"""Ti si AI kreativni direktor za content studio {brand_name}.
Pomazes brendovima kreirati vizualno atraktivne sadrzaje za drustvene mreze.

TVOJ ZADATAK:
Generiraš strukturirane scene-by-scene vizualne sadržaje (reels, videe, plakate) za društvene mreže.
Output je JSON koji frontend koristi za live preview s CSS animacijama.
Sadržaj mora biti profesionalan, moderan i privlačan ciljnoj publici.

═══════════════════════════════════════════════════════════
BRANDING I VIZUALNI IDENTITET
═══════════════════════════════════════════════════════════

{brand_section}

═══════════════════════════════════════════════════════════
PRAVILA ZA SCENE
═══════════════════════════════════════════════════════════

1. Svaka scena traje 2-5 sekundi
2. Pozicije (x, y) su u postocima (0-100) za responsive rendering
3. Koristi bold gradijente klupskih boja za pozadine
4. Text mora biti na HRVATSKOM jeziku
5. Animacije: fade_in, slide_up, slide_down, slide_left, slide_right, scale_up, scale_down, typewriter, bounce, pulse, blur_in, flip_x, flip_y, rotate_in, elastic, swing, glitch, shake_in, drop_in, zoom_rotate, letter_spread
6. Tranzicije između scena: fade, slide_left, slide_up, zoom_in, zoom_out, slide_right, slide_down, dissolve, blur_through, scale_fade, none
7. Koristi dinamične animacije (elastic, swing, drop_in, shake_in, glitch) za efektnije videe — ne samo fade_in!
7. Maksimalno 3 text layera po sceni
8. Uvijek dodaj brand logo overlay na barem jednu scenu
9. Koristi profesionalan i energičan ton prilagođen brendu
10. Za kampanje: koristi relevantne podatke o proizvodu/usluzi
11. Za tim spotlight: koristi puno ime osobe i poziciju
12. Caption mora sadržavati relevantne hashtagove (#DemoBrand #OurBrand itd.)

TIPOVI POZADINA:
- gradient: {{ "type": "gradient", "colors": ["#0A1A28", "#0057A8"], "direction": "to bottom right" }}
- color: {{ "type": "color", "color": "#0A1A28" }}
- image: {{ "type": "image", "src": "uploaded_image_url", "overlay_opacity": 0.6, "overlay_color": "#0A1A28" }}

DOSTUPNE ANIMACIJE ZA TEXT:
Osnovno:
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
Dinamično (preporuka za efektne videe):
- elastic: elastični spring bounce efekt — odličan za naslove
- swing: ljuljanje kao klatno — odličan za dramatične ulaze
- drop_in: pada odozgo s odskakivanjem — odličan za rezultate
- shake_in: tresenje s pojavljivanjem — odličan za matchday
Specijalno:
- flip_x: 3D okretanje oko horizontalne osi
- flip_y: 3D okretanje oko vertikalne osi
- rotate_in: rotacija s pojavljivanjem
- glitch: digitalni glitch efekt — odličan za transfer najave
- zoom_rotate: zoom i rotacija kombinacija
- letter_spread: razmak slova se širi — odličan za ime igrača

OUTPUT FORMAT (samo JSON, bez teksta):
{{
  "scenes": [
    {{
      "id": "scene_1",
      "order": 1,
      "duration": 3.0,
      "background": {{ "type": "gradient", "colors": ["#0A1A28", "#0057A8"], "direction": "to bottom" }},
      "text_layers": [
        {{
          "id": "text_1",
          "text": "MATCHDAY",
          "position": {{ "x": 50, "y": 40 }},
          "font_size": 72,
          "font_family": "Tektur",
          "font_weight": "800",
          "color": "#B8FF00",
          "text_align": "center",
          "animation": "scale_up",
          "animation_delay": 0.0
        }}
      ],
      "overlay_layers": [
        {{
          "id": "overlay_1",
          "type": "logo",
          "src": "/assets/brand-logo.svg",
          "position": {{ "x": 50, "y": 15 }},
          "size": 80,
          "animation": "fade_in",
          "animation_delay": 0.2
        }}
      ],
      "transition": "fade"
    }}
  ],
  "caption": "Hrvatski tekst opisa za objavu...",
  "hashtags": ["#DemoBrand", "#OurBrand"],
  "description": "Kratki opis za SEO / alt text",
  "total_duration": 15.0,
  "aspect_ratio": "9:16"
}}"""


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
- Generiraj 3-5 scena ovisno o tipu sadržaja
- Za reels/video: 3-4 scene po 2-4 sekunde
- Za plakat/post: 1-2 scene
- Animacije moraju biti dinamične i profesionalne
- Caption i hashtagovi moraju biti na hrvatskom
- Opis mora biti SEO-friendly
- VAŽNO: JSON mora biti kompaktan — koristi kratke ključeve, bez praznih redova
- Maksimalno 2-3 text layera po sceni, 0-1 overlay po sceni

SAMO JSON output, bez dodatnog teksta. Ne dodavaj markdown code blokove."""


async def generate_studio_scenes(
    api_key: str,
    brief: str,
    post_title: str,
    platform: str,
    content_type: str,
    media_descriptions: list[str] | None = None,
    client=None,
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

    system_prompt = _build_studio_system_prompt(client)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://shiftonezero.xyler.ai",
        "X-Title": "ShiftOneZero Content Studio",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 16384,
    }

    async with httpx.AsyncClient(timeout=180.0) as http_client:
        response = await http_client.post(OPENROUTER_URL, json=payload, headers=headers)
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

    # Try to repair truncated JSON (common when response hits token limit)
    repaired = _repair_truncated_json(content)
    if repaired:
        try:
            result = json.loads(repaired)
            logger.warning("Parsed studio AI response after JSON repair (truncated response)")
            return _validate_scene_data(result)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error("JSON repair also failed: %s", e)

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


def _repair_truncated_json(content: str) -> str | None:
    """Attempt to repair truncated JSON from a cut-off LLM response.

    Strategy: find the last complete scene object in the scenes array,
    close all open brackets/braces, and add default caption/hashtags.
    """
    import re

    content = content.strip()
    if content.startswith("```"):
        first_nl = content.find("\n")
        if first_nl != -1:
            content = content[first_nl + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    content = _fix_json(content)

    # Must start with { to be JSON
    start = content.find("{")
    if start == -1:
        return None

    content = content[start:]

    # Find the scenes array
    scenes_match = re.search(r'"scenes"\s*:\s*\[', content)
    if not scenes_match:
        return None

    # Try to find complete scene objects by looking for closing braces
    # that end a scene (followed by comma or bracket)
    scenes_start = scenes_match.end()

    # Find all positions where a scene object closes: },  or } ]
    complete_scenes = []
    depth = 0
    scene_start = None
    i = scenes_start

    while i < len(content):
        ch = content[i]
        if ch == '{':
            if depth == 0:
                scene_start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and scene_start is not None:
                scene_str = content[scene_start:i + 1]
                try:
                    json.loads(scene_str)
                    complete_scenes.append(scene_str)
                except json.JSONDecodeError:
                    pass
                scene_start = None
        i += 1

    if not complete_scenes:
        return None

    # Build repaired JSON with complete scenes only
    scenes_json = ",\n".join(complete_scenes)
    repaired = f'{{"scenes": [{scenes_json}], "caption": "", "hashtags": ["#DemoBrand", "#OurBrand"], "description": "", "total_duration": 0, "aspect_ratio": "9:16"}}'

    logger.info("Repaired truncated JSON: kept %d complete scenes out of possibly more", len(complete_scenes))
    return repaired
