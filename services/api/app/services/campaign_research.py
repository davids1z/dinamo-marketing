import json
import logging

import httpx

from app.config import settings
from app.integrations.web_research.base import WebResearchClientBase

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"


# ---------------------------------------------------------------------------
# Prompt templates  (brand-context-aware)
# ---------------------------------------------------------------------------

BRIEF_EXTRACTION_PROMPT = """Ti si vrhunski marketing strucnjak. Analiziraj sljedeci tekst kampanje za brend "{brand_name}".

Kontekst o brendu:
- Naziv: {brand_name}
- Opis poslovanja: {brand_desc}
- Ciljna publika: {brand_audience}
- Ton komunikacije: {brand_tone}

Vrati ISKLJUCIVO validan JSON objekt (bez markdown, bez ```):
{{
  "title": "Naziv kampanje",
  "campaign_type": "jedan od: product_launch|brand_awareness|seasonal|lead_generation|event|social_media|content|email|influencer|other",
  "objectives": ["Cilj 1", "Cilj 2"],
  "target_audience": ["Publika 1", "Publika 2"],
  "platforms": ["instagram", "tiktok", "youtube", "facebook", "linkedin"],
  "budget_estimate": "procjena budzeta ako je navedena ili 'nije navedeno'",
  "timeline": "trajanje kampanje ako je navedeno ili 'nije navedeno'",
  "key_messages": ["Kljucna poruka 1", "Kljucna poruka 2"],
  "tone": "ton komunikacije (npr. emotivan, profesionalan, zabavan...)",
  "competitors_to_watch": ["konkurent za pracenje"],
  "summary": "Kratki sazetak kampanje u 2-3 recenice"
}}

TEKST KAMPANJE:
{text}"""

PLAN_GENERATION_PROMPT = """Ti si vrhunski marketing strateg. Generiraj detaljan marketing plan za brend "{brand_name}".

KONTEKST O BRENDU:
- Naziv: {brand_name}
- Opis poslovanja: {brand_desc}
- Ciljna publika: {brand_audience}
- Ton komunikacije: {brand_tone}

BRIEF KAMPANJE:
{brief}

REZULTATI ISTRAZIVANJA:
{research}

Vrati ISKLJUCIVO validan JSON objekt (bez markdown, bez ```):
{{
  "plan_title": "Naziv marketing plana",
  "executive_summary": "Sazetak u 3-5 recenica",
  "strategy": {{
    "approach": "Opis strateskog pristupa u 2-3 recenice",
    "key_differentiators": ["Razlikovni faktor 1", "Razlikovni faktor 2", "Razlikovni faktor 3"],
    "success_metrics": ["KPI 1", "KPI 2", "KPI 3"]
  }},
  "predicted_results": {{
    "estimated_reach": "50K-80K",
    "estimated_engagement_rate": "3.5-5.2%",
    "estimated_conversions": "150-300",
    "estimated_ctr": "1.8-2.5%",
    "estimated_roas": "2.5-4.0x",
    "confidence": "medium",
    "reasoning": "Kratko objasnjenje zasto predvidjamo ove rezultate"
  }},
  "ad_hooks": [
    {{
      "platform": "instagram",
      "headline": "Privlacan naslov oglasa",
      "body": "Tekst oglasa u 2-3 recenice",
      "cta": "Poziv na akciju"
    }},
    {{
      "platform": "tiktok",
      "headline": "Hook za TikTok video",
      "body": "Opis koncepta videa",
      "cta": "Poziv na akciju"
    }},
    {{
      "platform": "facebook",
      "headline": "Facebook ad naslov",
      "body": "Facebook ad tekst",
      "cta": "Poziv na akciju"
    }}
  ],
  "content_calendar": [
    {{
      "week": 1,
      "theme": "Tema tjedna",
      "posts": [
        {{
          "platform": "instagram",
          "format": "reel",
          "title": "Naslov objave",
          "description": "Opis sadrzaja",
          "hashtags": ["#hashtag1", "#hashtag2"],
          "best_time": "18:00",
          "day": "ponedjeljak"
        }}
      ]
    }}
  ],
  "budget_allocation": {{
    "meta_ads": "30%",
    "tiktok_ads": "25%",
    "google_ads": "15%",
    "youtube_ads": "10%",
    "influencer": "10%",
    "content_production": "10%"
  }},
  "risk_factors": ["Rizik 1", "Rizik 2"],
  "recommendations": ["Preporuka 1", "Preporuka 2", "Preporuka 3"]
}}

Generiraj plan za minimalno 4 tjedna sadrzaja sa po 3-5 objava tjedno.
Budi konkretan — navedi tocne cifre, postotke i metrike.
Predlozi oglasne hookove moraju biti privlacni i prilagodeni brendu.
"""


class CampaignResearchService:
    def __init__(self, web_research_client: WebResearchClientBase):
        self.web = web_research_client

    async def extract_brief(self, text: str, brand_context: dict | None = None) -> dict:
        """Phase 1: Use AI to extract structured brief from document text."""
        ctx = brand_context or {}
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            return {
                "error": "OpenRouter API key not configured",
                "title": "Nepoznata kampanja",
                "campaign_type": "other",
                "objectives": [],
                "target_audience": [],
                "platforms": ["instagram", "facebook"],
                "summary": text[:200],
            }

        prompt = BRIEF_EXTRACTION_PROMPT.format(
            brand_name=ctx.get("name", "Brend"),
            brand_desc=ctx.get("description", "nije navedeno"),
            brand_audience=ctx.get("target_audience", "nije navedeno"),
            brand_tone=ctx.get("tone", "profesionalan"),
            text=text[:8000],
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shiftonezero.xyler.ai",
            "X-Title": "ShiftOneZero Marketing Platform",
        }

        payload = {
            "model": MODEL,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 4000,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parse JSON from response
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("Failed to parse brief extraction response: %s", content[:200])
            return {
                "title": "Greska u analizi",
                "campaign_type": "other",
                "objectives": [],
                "summary": text[:200],
                "error": "Failed to parse AI response",
            }

    async def research_campaign(self, brief: dict, brand_context: dict | None = None) -> dict:
        """Phase 2: Research the campaign topic using web search."""
        ctx = brand_context or {}
        campaign_type = brief.get("campaign_type", "marketing")
        title = brief.get("title", "kampanja")
        industry = ctx.get("description", "")[:100]

        # Generic marketing search queries
        search_queries = [
            f"{campaign_type} campaign best practices 2025 2026",
            f"social media marketing {campaign_type} case study ROI",
            f"{title} marketing strategy trends",
            f"digital marketing {campaign_type} benchmark engagement rates conversion",
        ]

        # Add competitor-specific queries
        competitors = brief.get("competitors_to_watch", [])
        for comp in competitors[:2]:
            search_queries.append(f"{comp} {campaign_type} campaign marketing strategy")

        # Add industry-specific query
        if industry:
            search_queries.append(f"{industry} {campaign_type} marketing examples")

        research = await self.web.research_topic(title, search_queries)
        return research

    async def generate_plan(self, brief: dict, research: dict,
                            brand_context: dict | None = None) -> dict:
        """Phase 3: Generate comprehensive marketing plan."""
        ctx = brand_context or {}
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            return self._generate_mock_plan(brief, ctx)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shiftonezero.xyler.ai",
            "X-Title": "ShiftOneZero Marketing Platform",
        }

        prompt = PLAN_GENERATION_PROMPT.format(
            brand_name=ctx.get("name", "Brend"),
            brand_desc=ctx.get("description", "nije navedeno"),
            brand_audience=ctx.get("target_audience", "nije navedeno"),
            brand_tone=ctx.get("tone", "profesionalan"),
            brief=json.dumps(brief, ensure_ascii=False, indent=2),
            research=json.dumps(
                research.get("results", [])[:10], ensure_ascii=False, indent=2
            ),
        )

        payload = {
            "model": MODEL,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 16000,
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("Failed to parse plan generation response: %s", content[:200])
            return self._generate_mock_plan(brief, ctx)

    def _generate_mock_plan(self, brief: dict, brand_context: dict | None = None) -> dict:
        ctx = brand_context or {}
        brand_name = ctx.get("name", "Brend")
        title = brief.get("title", "Kampanja")
        return {
            "plan_title": f"Marketing plan: {title}",
            "executive_summary": (
                f"Sveobuhvatni marketing plan za kampanju '{title}' brenda {brand_name}. "
                f"Plan uključuje multi-platformski pristup s fokusom na Instagram i TikTok "
                f"sadržaj, optimiziran za maksimalni doseg i konverzije."
            ),
            "strategy": {
                "approach": (
                    "Multi-platformski pristup s naglaskom na video sadržaj i "
                    "angažiranje ciljne publike kroz personalizirani storytelling."
                ),
                "key_differentiators": [
                    "Autentičan storytelling prilagođen brendu",
                    "Data-driven kreativni pristup",
                    "Interaktivni formati za povećanje angažmana",
                ],
                "success_metrics": [
                    "Engagement rate > 3.5%",
                    "Doseg > 50K korisnika",
                    "CTR > 2%",
                ],
            },
            "predicted_results": {
                "estimated_reach": "50K-80K",
                "estimated_engagement_rate": "3.5-5.2%",
                "estimated_conversions": "150-300",
                "estimated_ctr": "1.8-2.5%",
                "estimated_roas": "2.5-4.0x",
                "confidence": "medium",
                "reasoning": (
                    f"Na temelju prosječnih performansi sličnih kampanja u industriji "
                    f"i trenutnih trendova na društvenim mrežama za {brand_name}."
                ),
            },
            "ad_hooks": [
                {
                    "platform": "instagram",
                    "headline": f"Otkrijte novu dimenziju {brand_name}",
                    "body": f"Ekskluzivan pogled u svijet {brand_name}. Priključite se tisućama zadovoljnih korisnika.",
                    "cta": "Saznaj više →",
                },
                {
                    "platform": "tiktok",
                    "headline": f"POV: Upravo ste otkrili {brand_name} 🔥",
                    "body": f"Trend koji osvaja TikTok — pogledajte zašto svi govore o {brand_name}.",
                    "cta": "Isprobaj sada",
                },
                {
                    "platform": "facebook",
                    "headline": f"{brand_name} — Vaš sljedeći korak",
                    "body": f"Pridružite se zajednici od tisuća korisnika koji su odabrali {brand_name}. Posebna ponuda za nove korisnike.",
                    "cta": "Započni danas",
                },
            ],
            "content_calendar": [
                {
                    "week": w,
                    "theme": f"Tjedan {w} — {['Najava i teasing', 'Izgradnja interesa', 'Lansiranje kampanje', 'Održavanje i optimizacija'][w - 1]}",
                    "posts": [
                        {
                            "platform": "instagram",
                            "format": "reel",
                            "title": f"Reel — {['Teaser video', 'Behind the scenes', 'Lansiranje', 'UGC highlight'][w - 1]}",
                            "description": "Kratki video sadržaj za Instagram",
                            "hashtags": [f"#{brand_name.replace(' ', '')}", "#Marketing"],
                            "best_time": "18:00",
                            "day": "ponedjeljak",
                        },
                        {
                            "platform": "tiktok",
                            "format": "video",
                            "title": f"TikTok — {['Hook video', 'Trend format', 'Launch drop', 'Community reply'][w - 1]}",
                            "description": "TikTok nativni format video",
                            "hashtags": [f"#{brand_name.replace(' ', '')}", "#FYP"],
                            "best_time": "19:00",
                            "day": "srijeda",
                        },
                        {
                            "platform": "facebook",
                            "format": "post",
                            "title": f"FB — {['Najava', 'Članak', 'Promo post', 'Testimonijal'][w - 1]}",
                            "description": "Facebook objava s vizualom",
                            "hashtags": [f"#{brand_name.replace(' ', '')}"],
                            "best_time": "12:00",
                            "day": "petak",
                        },
                    ],
                }
                for w in range(1, 5)
            ],
            "budget_allocation": {
                "meta_ads": "30%",
                "tiktok_ads": "25%",
                "google_ads": "15%",
                "youtube_ads": "10%",
                "influencer": "10%",
                "content_production": "10%",
            },
            "risk_factors": [
                "Moguća zasićenost publike sadržajem — pratiti frequency cap",
                "Trendovi se brzo mijenjaju — potrebna tjedna optimizacija",
            ],
            "recommendations": [
                "Koristiti UGC (user-generated content) za autentičnost",
                "A/B testirati razlicite kreative i hookove",
                "Pratiti konkurenciju i prilagoditi strategiju tjedno",
            ],
        }
