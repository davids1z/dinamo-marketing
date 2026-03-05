"""OpenRouter API client for AI content generation using Gemini 2.5 Pro."""

import json
import logging
import calendar
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

SYSTEM_PROMPT = """Ti si AI content strateg za GNK Dinamo Zagreb — vodeći hrvatski nogometni klub.

KONTEKST O KLUBU:
- Nadimak: "Modri" (The Blues), boje: plava i bijela
- Stadion: Maksimir, Zagreb, Hrvatska
- Liga: HNL (Hrvatska nogometna liga) — višestruki prvaci
- Europska natjecanja: UEFA Champions League / Europa League redoviti sudionik
- Akademija: jedna od najjačih u regiji, poznata po razvoju mladih igrača
- Navijači: Bad Blue Boys (BBB), aktivna dijaspora u Njemačkoj, Austriji, Švicarskoj, SAD-u
- Fan token na Socios.com — prva hrvatska sportska organizacija

STUPOVI SADRŽAJA:
1. Dan utakmice — najava, countdown, sastav, live reakcije, golovi, rezultat, highlights
2. Igrači — spotlight serije, intervjui, challenge videi, reakcije
3. Iza kulisa — treninzi, svlačionica, putovanja, priprema terena
4. Akademija — mladi talenti, utakmice U19/U17, razvojni put
5. Navijači — Q&A, ankete, challenge, koreografije, UGC
6. Dijaspora — eventi zajednice, streaming utakmica, povezivanje
7. Europske noći — UCL/EL poseban sadržaj, atmosfera, rivalstva
8. Lifestyle — Zagreb, kultura, igrači izvan terena, merch, dresovi

PLATFORME I FORMATI:
- Instagram: Reels (15-60s), Stories (24h), Carousel (do 10 slika), Post
- TikTok: Video (15-60s), trend challenge, duet, behind the scenes
- YouTube: Full highlights (5-15min), Shorts (<60s), Press konferencije, Analize
- Facebook: Event, Post, Video, Community post, Live stream

RASPORED OBJAVLJIVANJA:
- Optimalna vremena: 9:00 (jutarnji), 12:00 (ručak), 17:00 (poslije posla), 20:00 (večernji)
- Na dan utakmice: 5-8 objava (countdown, sastav, live, golovi, FT, highlights)
- Normalni dan: 2-4 objave raspoređene kroz dan
- Vikend bez utakmice: 2-3 objave (lifestyle, throwback, navijači)

UZORCI SADRŽAJA PO TJEDNU UTAKMICE:
- Dan -2: Taktički preview + analiza protivnika (YouTube)
- Dan -1: Objava sastava + matchday najava (IG carousel + TikTok)
- Dan utakmice: Countdown stories, matchday grafika, golovi, FT rezultat
- Dan +1: Produženi highlights (YT), best moments reel (IG), intervju igrača
- Dan +2: Statistika infografika, reakcije navijača, najava sljedeće

KLJUČNE NAPOMENE:
- Sav tekst MORA biti na HRVATSKOM jeziku
- Hashtagovi: #Dinamo #GNKDinamo #DynamoZagreb #Modri #HNL + specifični za sadržaj
- Vizualni stil: plavi overlay, dinamične akcijske fotografije, čisti dizajn
- Ton: ponosan, strasan, profesionalan ali pristupačan navijačima
- Svaki post mora imati jasnu svrhu i poziv na akciju"""

USER_PROMPT_TEMPLATE = """Generiraj detaljan content plan za {month_name} {year}. za GNK Dinamo Zagreb.

ZAHTJEVI:
- SVAKI dan u mjesecu mora imati MINIMALNO 2 objave, a poželjno 3-4
- Mjesec ima {days_in_month} dana
- Subote su najčešće HNL utakmice (pojačaj sadržaj oko subota)
- Srijede su potencijalno europske utakmice
- Sadržaj mora biti raznolik — ne ponavljaj iste ideje
- Svaka objava mora imati konkretnu, kreativnu ideju

Odgovori ISKLJUČIVO u JSON formatu — niz objekata. Svaki objekt ima:
{{
  "day": broj_dana,
  "platform": "instagram" | "tiktok" | "youtube" | "facebook",
  "type": "reel" | "story" | "carousel" | "video" | "short" | "post" | "event",
  "title": "Kratki naslov na hrvatskom",
  "description": "Detaljan opis ideje sadržaja (2-3 rečenice)",
  "caption_hr": "Puni caption za objavu na hrvatskom jeziku, uključujući emotikone",
  "scheduled_time": "HH:MM",
  "content_pillar": "match_day" | "player_spotlight" | "behind_scenes" | "academy" | "fan_engagement" | "diaspora" | "european_nights" | "lifestyle",
  "hashtags": ["#Dinamo", "#HNL", ...],
  "visual_brief": "Opis vizualnog stila i smjernice za kreativu"
}}

Odgovori SAMO JSON nizom, bez dodatnog teksta ili markdown formatiranja."""


async def generate_content_plan(api_key: str, month: int, year: int) -> list[dict]:
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
    )

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
        "temperature": 0.8,
        "max_tokens": 32000,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]

    # Strip markdown fences if present
    content = content.strip()
    if content.startswith("```"):
        # Remove opening fence
        first_newline = content.index("\n")
        content = content[first_newline + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    posts = json.loads(content)

    if not isinstance(posts, list):
        raise ValueError("Expected a JSON array from AI response")

    logger.info(f"Generated {len(posts)} posts for {month_name} {year}")
    return posts
