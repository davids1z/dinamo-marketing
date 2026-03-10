"""OpenRouter API client for generating AI insights across dashboard pages."""

import json
import logging
import hashlib

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

SYSTEM_PROMPT = """Ti si AI analitičar za GNK Dinamo Zagreb marketing platformu.

Tvoj zadatak je analizirati podatke s različitih stranica dashboarda i pružiti:
1. **Trendovi** — uočeni uzorci u podacima (rast, pad, sezonski efekti)
2. **Anomalije** — neočekivane vrijednosti ili odstupanja
3. **Preporuke** — konkretne, provedive akcije za poboljšanje

PRAVILA:
- Sav tekst MORA biti na HRVATSKOM jeziku
- Budi KRATAK i konkretan — svaki opis max 1-2 kratke rečenice, izbjegavaj općenite savjete
- Fokusiraj se na podatke koji su dostupni, ne pretpostavljaj
- Svaka preporuka mora biti provediva i specifična
- Koristi nogometnu terminologiju gdje je primjenjivo
- Ton: profesionalan, analitičan, ali pristupačan

Odgovori ISKLJUČIVO u JSON formatu:
{
  "summary": "2-3 rečenice sažetka najvažnijih uvida",
  "insights": [
    {
      "type": "trend|anomaly|recommendation",
      "title": "Kratak naslov",
      "description": "Detaljan opis uvida (1-2 rečenice)",
      "impact": "high|medium|low",
      "action": "Konkretna preporučena akcija (1 rečenica)"
    }
  ]
}

Generiraj 3-5 uvida. SAMO JSON, bez dodatnog teksta."""


# --- Page-specific prompt builders ---

def _build_dashboard_prompt(data: dict) -> str:
    return f"""Analiziraj glavne metrike dashboarda za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: ukupni pregled performansi, ključne KPI-ove, nedavne aktivnosti i trendove."""


def _build_analytics_prompt(data: dict) -> str:
    return f"""Analiziraj analitičke podatke društvenih mreža za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: top objave po engagementu, doseg, konverzijski lijevak, performanse plaćenih kampanja."""


def _build_sentiment_prompt(data: dict) -> str:
    return f"""Analiziraj sentiment podatke za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: omjer pozitivnog/negativnog sentimenta, ključne teme, sentimentne upozorenja, promjene u percepciji."""


def _build_competitors_prompt(data: dict) -> str:
    return f"""Analiziraj konkurentske podatke za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: usporedbu s konkurentima, praznine u sadržaju, engagement usporedbu, prilike za diferenciaciju."""


def _build_fan_insights_prompt(data: dict) -> str:
    return f"""Analiziraj podatke o navijačima GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: segmente navijača, konverzijski lijevak, životnu vrijednost navijača (CLV), stope odljeva i retencije."""


def _build_channel_audit_prompt(data: dict) -> str:
    return f"""Analiziraj podatke o kanalima GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: performanse po platformi, format breakdown, optimalne formate sadržaja, preporuke za kanale."""


def _build_social_listening_prompt(data: dict) -> str:
    return f"""Analiziraj podatke socijalnog slušanja za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: ukupne spominjanja, udio glasa (share of voice), trending teme, sentiment prema ključnim temama."""


def _build_campaigns_prompt(data: dict) -> str:
    return f"""Analiziraj podatke o kampanjama GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: performanse kampanja, budžet vs. rezultati, ROAS, preporuke za optimizaciju."""


def _build_reports_prompt(data: dict) -> str:
    return f"""Analiziraj izvještajne podatke za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: trendove u izvještajima, ključne metrike kroz vrijeme, preporuke za buduće izvještavanje."""


def _build_academy_prompt(data: dict) -> str:
    return f"""Analiziraj podatke o akademiji GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: igrače akademije, transferne prihode, content pipeline, prilike za promociju mladih talenata."""


def _build_diaspora_prompt(data: dict) -> str:
    return f"""Analiziraj podatke o dijaspori GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: zajednice po zemljama, engagement dijaspore, prilike za rast, sadržajne preporuke za dijasporu."""


def _build_market_research_prompt(data: dict) -> str:
    return f"""Analiziraj podatke istraživanja tržišta za GNK Dinamo Zagreb:

Podaci: {json.dumps(data, ensure_ascii=False, default=str)}

Fokusiraj se na: tržišne rezultate, prilike za ekspanziju, konkurentsku poziciju na ključnim tržištima."""


PROMPT_BUILDERS: dict[str, callable] = {
    "dashboard": _build_dashboard_prompt,
    "analytics": _build_analytics_prompt,
    "sentiment": _build_sentiment_prompt,
    "competitors": _build_competitors_prompt,
    "fan_insights": _build_fan_insights_prompt,
    "channel_audit": _build_channel_audit_prompt,
    "social_listening": _build_social_listening_prompt,
    "campaigns": _build_campaigns_prompt,
    "reports": _build_reports_prompt,
    "academy": _build_academy_prompt,
    "diaspora": _build_diaspora_prompt,
    "market_research": _build_market_research_prompt,
}


def compute_data_hash(page_key: str, page_data: dict) -> str:
    """Compute a short hash of page data for cache keying."""
    raw = json.dumps({"key": page_key, "data": page_data}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def generate_insights(api_key: str, page_key: str, page_data: dict) -> dict:
    """Call OpenRouter (Gemini 2.5 Pro) to generate insights for a dashboard page."""
    builder = PROMPT_BUILDERS.get(page_key)
    if not builder:
        raise ValueError(f"Unknown page_key: {page_key}")

    user_prompt = builder(page_data)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dinamo.xyler.ai",
        "X-Title": "Dinamo Marketing Platform",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.5,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    logger.info("AI insights response length: %d chars for page %s", len(content), page_key)

    return _parse_insights_response(content)


def _parse_insights_response(content: str) -> dict:
    """Parse AI insights JSON response."""
    import re

    content = content.strip()

    # Strip markdown fences
    if content.startswith("```"):
        first_newline = content.index("\n")
        content = content[first_newline + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Fix common JSON issues
    content = _fix_json(content)

    # Try direct parse
    try:
        result = json.loads(content)
        if isinstance(result, dict) and "insights" in result:
            return result
        if isinstance(result, dict) and "summary" in result:
            return result
    except json.JSONDecodeError:
        pass

    # Try to find JSON object
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1:
        json_str = content[start:end + 1]
        try:
            result = json.loads(json_str)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    # Try to repair truncated JSON
    repaired = _repair_truncated_json(content)
    if repaired:
        try:
            result = json.loads(repaired)
            if isinstance(result, dict):
                logger.info("Successfully repaired truncated JSON for insights")
                return result
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse AI insights response: %s", content[:500])
    # Return a fallback structure
    return {
        "summary": "AI analiza trenutno nije dostupna. Pokušajte ponovo.",
        "insights": [],
    }


def _repair_truncated_json(content: str) -> str | None:
    """Attempt to repair truncated JSON by closing open brackets/braces."""
    # Find the start of JSON
    start = content.find("{")
    if start == -1:
        return None

    s = content[start:]

    # Track open brackets
    in_string = False
    escape = False
    stack = []

    for ch in s:
        if escape:
            escape = False
            continue
        if ch == '\\' and in_string:
            escape = True
            continue
        if ch == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in '{[':
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()

    if not stack:
        return None  # Already balanced, not truncated

    # Close any open string (if we're still in a string)
    if in_string:
        s += '"'

    # Remove trailing comma or partial key-value
    s = s.rstrip()
    if s.endswith(','):
        s = s[:-1]
    # Remove incomplete key-value pairs (e.g., "key": "value... )
    import re
    s = re.sub(r',?\s*"[^"]*":\s*"[^"]*$', '', s)

    # Close remaining brackets
    for bracket in reversed(stack):
        if bracket == '{':
            s += '}'
        elif bracket == '[':
            s += ']'

    return s


def _fix_json(s: str) -> str:
    """Fix common JSON issues from LLM output."""
    import re
    s = re.sub(r',\s*([}\]])', r'\1', s)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    return s
