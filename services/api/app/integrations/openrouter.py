"""OpenRouter API client for AI content generation using Gemini 2.5 Pro.

ShiftOneZero Marketing Platform
"""

import json
import json as _json
import logging
import calendar
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

# Fallback system prompt used when no client context is available
_FALLBACK_SYSTEM_PROMPT = "Ti si AI content strateg za marketinšku platformu. Kreiraj sadržaj prema zadanim parametrima."


def build_system_prompt(client=None, project=None) -> str:
    """Build AI system prompt from client's brand profile + optional project context."""
    if client is None:
        # Fallback for when no client context is available
        return _FALLBACK_SYSTEM_PROMPT

    if hasattr(client, 'ai_system_prompt_override') and client.ai_system_prompt_override:
        base = client.ai_system_prompt_override
        # Append project context if available
        if project and hasattr(project, 'ai_context') and project.ai_context:
            base += f"\n\nKONTEKST PROJEKTA ({project.name}):\n{project.ai_context}"
        return base

    languages = ", ".join(client.languages or ["hr"])
    colors = _json.dumps(client.brand_colors or {})
    pillars = client.content_pillars or []
    pillar_text = "\n".join(
        f"  {i+1}. {p.get('name', p.get('id', ''))}" for i, p in enumerate(pillars)
    ) or "  (nije definirano)"
    hashtags = ", ".join(client.hashtags or [])
    handles = client.social_handles or {}
    handles_text = "\n".join(f"  - {k}: {v}" for k, v in handles.items()) or "  (nije definirano)"

    prompt = f"""Ti si AI content strateg za marketinšku platformu brenda "{client.name}".

KONTEKST BRENDA:
- Opis: {client.business_description or 'Nije definirano'}
- Proizvod/usluga: {client.product_info or 'Nije definirano'}
- Ton komunikacije: {client.tone_of_voice or 'Profesionalan, moderan'}
- Ciljna publika: {client.target_audience or 'Nije definirano'}
- Boje brenda: {colors}
- Website: {client.website_url or 'Nije definirano'}
- Jezici: {languages}
- Hashtagovi: {hashtags or 'Nisu definirani'}

STUPOVI SADRŽAJA:
{pillar_text}

DRUŠTVENE MREŽE:
{handles_text}

PLATFORME I FORMATI:
- Instagram: Reels (15-60s), Stories (24h), Carousel (do 10 slika), Post
- TikTok: Video (15-60s), trend challenge, behind the scenes
- YouTube: Full video (5-15min), Shorts (<60s), Livestream
- Facebook: Event, Post, Video, Community post, Live stream

PRAVILA:
1. Sadržaj UVIJEK prilagodi tonu i identitetu brenda
2. Koristi definirane hashtagove i handle-ove
3. Poštuj jezične preferencije klijenta
4. Svaki post mora imati jasnu poruku i CTA
5. Odgovori ISKLJUČIVO u JSON formatu kada je zatraženo
"""
    # Append project-level AI context if available
    if project and hasattr(project, 'ai_context') and project.ai_context:
        prompt += f"\nKONTEKST PROJEKTA ({project.name}):\n{project.ai_context}\n"

    return prompt

USER_PROMPT_TEMPLATE = """Generiraj content plan za {month_name} {year}. za brend.

ZAHTJEVI:
- SVAKI dan mora imati TOČNO 2 objave
- Mjesec ima {days_in_month} dana = točno {total_posts} objava ukupno
- Raznolik sadržaj, ne ponavljaj ideje
- Budi kratak i koncizan u opisima (1 rečenica)

JSON niz objekata, svaki:
{{"day":N,"platform":"instagram|tiktok|youtube|facebook","type":"reel|story|carousel|video|short|post","title":"naslov","description":"jedna rečenica opisa","scheduled_time":"HH:MM","content_pillar":"match_day|player_spotlight|behind_scenes|academy|fan_engagement|diaspora|european_nights|lifestyle","hashtags":["#DemoBrand","#OurBrand"]}}

SAMO JSON niz, bez teksta."""


async def generate_content_plan(api_key: str, month: int, year: int, client=None) -> list[dict]:
    """Call OpenRouter (Gemini 2.5 Pro) to generate a monthly content plan."""
    month_name = [
        "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
        "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac"
    ][month - 1]
    days_in_month = calendar.monthrange(year, month)[1]

    user_prompt = USER_PROMPT_TEMPLATE.format(
        month_name=month_name,
        year=year,
        days_in_month=days_in_month,
        total_posts=days_in_month * 2,
    )

    system_prompt = build_system_prompt(client)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://shiftonezero.xyler.ai",
        "X-Title": "ShiftOneZero Marketing Platform",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.8,
        "max_tokens": 16000,
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    logger.info(f"Raw AI response length: {len(content)} chars")

    posts = _parse_ai_response(content)

    logger.info(f"Generated {len(posts)} posts for {month_name} {year}")
    return posts


def _parse_ai_response(content: str) -> list[dict]:
    """Parse AI response, handling various JSON formats, truncation, and quirks."""
    import re

    # Strip markdown fences if present
    content = content.strip()
    if content.startswith("```"):
        first_newline = content.index("\n")
        content = content[first_newline + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Fix common JSON issues before any parsing
    content = _fix_json(content)

    # Try direct parse first
    try:
        result = json.loads(content)
        return _extract_posts_list(result)
    except json.JSONDecodeError:
        pass

    # Try to find a complete JSON array
    start = content.find("[")
    end = content.rfind("]")
    if start != -1 and end != -1:
        json_str = content[start:end + 1]
        try:
            result = json.loads(json_str)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

    # Try to find a JSON object that contains an array
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1:
        json_str = content[start:end + 1]
        try:
            result = json.loads(json_str)
            return _extract_posts_list(result)
        except json.JSONDecodeError:
            pass

    # Handle truncated JSON — find the last complete object in the array
    start = content.find("[")
    if start != -1:
        json_str = content[start:]
        posts = _salvage_truncated_json(json_str)
        if posts:
            logger.warning(f"Salvaged {len(posts)} posts from truncated JSON response")
            return posts

    logger.error(f"All JSON parsing attempts failed")
    logger.error(f"First 500 chars of response: {content[:500]}")
    logger.error(f"Last 200 chars of response: {content[-200:]}")
    raise ValueError("Could not parse AI response as JSON")


def _extract_posts_list(result) -> list[dict]:
    """Extract a list of posts from parsed JSON (could be list or dict with list)."""
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        # Look for any key that contains a list of dicts
        for key in ("posts", "content_plan", "plan", "data", "items"):
            if key in result and isinstance(result[key], list):
                return result[key]
        # Try any key that's a list
        for value in result.values():
            if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
                return value
    raise ValueError(f"Expected a JSON array or object with posts array, got {type(result)}")


def _salvage_truncated_json(json_str: str) -> list[dict]:
    """Try to extract complete objects from truncated JSON array."""
    # Find positions of all top-level object boundaries
    # by tracking brace/bracket depth
    posts = []
    depth = 0
    in_string = False
    escape_next = False
    obj_start = None

    for i, ch in enumerate(json_str):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue

        if ch == '{':
            if depth == 1:  # Inside the top-level array
                obj_start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 1 and obj_start is not None:
                # Found a complete top-level object
                obj_str = json_str[obj_start:i + 1]
                try:
                    obj = json.loads(obj_str)
                    posts.append(obj)
                except json.JSONDecodeError:
                    pass
                obj_start = None
        elif ch == '[' and depth == 0:
            depth = 1

    return posts


def _fix_json(s: str) -> str:
    """Fix common JSON issues from LLM output."""
    import re
    # Remove trailing commas before ] or }
    s = re.sub(r',\s*([}\]])', r'\1', s)
    # Fix unescaped newlines inside JSON strings (between quotes)
    # Remove control characters except common whitespace
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    return s
