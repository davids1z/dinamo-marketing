"""AI-powered brand profile extraction from text content.

Uses OpenRouter (Gemini 2.5 Pro) to analyze website text or uploaded documents
and extract structured brand profile fields.
"""

import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

_SYSTEM_PROMPT = """Ti si AI stručnjak za analizu brendova. Analiziraj zadani tekst i izvuci strukturirane informacije o brendu/tvrtki.

Odgovori ISKLJUČIVO u JSON formatu s ovim poljima:
{
  "business_description": "Opis poslovanja tvrtke — misija, vizija, čime se bave (2-4 rečenice)",
  "product_info": "Glavni proizvodi ili usluge koje tvrtka nudi (1-3 rečenice)",
  "target_audience": "Ciljna publika — tko su kupci/korisnici (1-2 rečenice)",
  "tone_of_voice": "Jedan od: professional, friendly, bold, creative, formal, casual, inspirational, humorous"
}

PRAVILA:
1. Piši na hrvatskom jeziku
2. Budi koncizan i informativan
3. Za tone_of_voice koristi SAMO jednu od ponuđenih vrijednosti
4. Ako ne možeš odrediti neko polje, vrati prazan string ""
5. SAMO JSON, bez teksta oko njega"""

_USER_PROMPT = """Analiziraj sljedeći tekst i izvuci informacije o brendu/tvrtki:

---
{text}
---

Vrati SAMO JSON objekt."""


async def analyze_brand(text: str, api_key: str) -> dict:
    """Analyze text content and extract brand profile suggestions.

    Returns dict with keys: business_description, product_info, target_audience, tone_of_voice.
    """
    # Trim text if very long
    if len(text) > 12_000:
        text = text[:12_000]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://shiftonezero.xyler.ai",
        "X-Title": "ShiftOneZero Marketing Platform",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _USER_PROMPT.format(text=text)},
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    logger.info("Brand analysis response length: %d chars", len(content))

    result = _parse_response(content)
    return result


def _parse_response(content: str) -> dict:
    """Parse AI response into structured brand data."""
    content = content.strip()

    # Strip markdown fences
    if content.startswith("```"):
        first_newline = content.index("\n")
        content = content[first_newline + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Remove trailing commas
    content = re.sub(r",\s*([}\]])", r"\1", content)

    # Try direct parse
    try:
        result = json.loads(content)
        return _validate(result)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1:
        try:
            result = json.loads(content[start : end + 1])
            return _validate(result)
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse brand analysis response: %s", content[:500])
    raise ValueError("Could not parse AI response as JSON")


def _validate(data: dict) -> dict:
    """Ensure expected keys exist and values are strings."""
    expected_keys = ["business_description", "product_info", "target_audience", "tone_of_voice"]
    valid_tones = {
        "professional", "friendly", "bold", "creative",
        "formal", "casual", "inspirational", "humorous",
    }

    result = {}
    for key in expected_keys:
        value = data.get(key, "")
        result[key] = str(value).strip() if value else ""

    # Validate tone_of_voice
    if result["tone_of_voice"] not in valid_tones:
        result["tone_of_voice"] = ""

    return result
