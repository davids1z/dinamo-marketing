import json
import logging

import httpx

from app.config import settings
from app.integrations.web_research.base import WebResearchClientBase

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

BRIEF_EXTRACTION_PROMPT = """Ti si marketing strucnjak za Demo Brand. Analiziraj sljedeci tekst kampanje i izvuci strukturirane podatke.

Vrati ISKLJUCIVO validan JSON objekt (bez markdown, bez ```):
{
  "title": "Naziv kampanje",
  "campaign_type": "jedan od: matchday|transfer|season_ticket|merchandise|sponsor|academy|diaspora|european|community|other",
  "objectives": ["Cilj 1", "Cilj 2"],
  "target_audience": ["Publika 1", "Publika 2"],
  "platforms": ["instagram", "tiktok", "youtube", "facebook"],
  "budget_estimate": "procjena budzeta ako je navedena ili 'nije navedeno'",
  "timeline": "trajanje kampanje ako je navedeno ili 'nije navedeno'",
  "key_messages": ["Kljucna poruka 1", "Kljucna poruka 2"],
  "tone": "ton komunikacije (npr. emotivan, profesionalan, zabavan...)",
  "competitors_to_watch": ["klub ili brand za pracenje"],
  "summary": "Kratki sazetak kampanje u 2-3 recenice"
}

TEKST KAMPANJE:
"""

PLAN_GENERATION_PROMPT = """Ti si vrhunski marketing strateg za Demo Brand, hrvatski nogometni klub koji se natjece u HNL-u i europskim natjecanjima.

Na temelju briefinga kampanje i rezultata istrazivanja, napravi detaljan marketing plan.

BRIEF KAMPANJE:
{brief}

REZULTATI ISTRAZIVANJA:
{research}

Vrati ISKLJUCIVO validan JSON objekt (bez markdown, bez ```):
{{
  "plan_title": "Naziv marketing plana",
  "executive_summary": "Sazetak u 3-5 recenica",
  "strategy": {{
    "approach": "Opis strateskog pristupa",
    "key_differentiators": ["Razlikovni faktor 1", "Razlikovni faktor 2"],
    "success_metrics": ["KPI 1", "KPI 2", "KPI 3"]
  }},
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
          "hashtags": ["#DemoBrand", "#hashtag"],
          "best_time": "18:00",
          "day": "ponedjeljak"
        }}
      ]
    }}
  ],
  "budget_allocation": {{
    "instagram_ads": "30%",
    "tiktok_ads": "25%",
    "youtube_ads": "15%",
    "facebook_ads": "15%",
    "influencer": "10%",
    "production": "5%"
  }},
  "risk_factors": ["Rizik 1", "Rizik 2"],
  "recommendations": ["Preporuka 1", "Preporuka 2", "Preporuka 3"]
}}

Generiraj plan za minimalno 4 tjedna sadrzaja sa po 3-5 objava tjedno.
"""


class CampaignResearchService:
    def __init__(self, web_research_client: WebResearchClientBase):
        self.web = web_research_client

    async def extract_brief(self, text: str) -> dict:
        """Phase 1: Use AI to extract structured brief from document text."""
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

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shiftonezero.xyler.ai",
            "X-Title": "ShiftOneZero Marketing Platform",
        }

        payload = {
            "model": MODEL,
            "messages": [
                {"role": "user", "content": BRIEF_EXTRACTION_PROMPT + text[:8000]},
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

    async def research_campaign(self, brief: dict) -> dict:
        """Phase 2: Research the campaign topic using web search."""
        campaign_type = brief.get("campaign_type", "marketing")
        title = brief.get("title", "kampanja")

        search_queries = [
            f"football club {campaign_type} campaign best practices 2025 2026",
            f"social media marketing {campaign_type} sports club case study",
            f"Demo Brand {campaign_type} fan engagement",
            f"European football club {campaign_type} benchmark engagement rates",
        ]

        # Add competitor-specific queries
        competitors = brief.get("competitors_to_watch", [])
        for comp in competitors[:2]:
            search_queries.append(f"{comp} {campaign_type} campaign social media")

        research = await self.web.research_topic(title, search_queries)
        return research

    async def generate_plan(self, brief: dict, research: dict) -> dict:
        """Phase 3: Generate comprehensive marketing plan."""
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            return self._generate_mock_plan(brief)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shiftonezero.xyler.ai",
            "X-Title": "ShiftOneZero Marketing Platform",
        }

        prompt = PLAN_GENERATION_PROMPT.format(
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
            return self._generate_mock_plan(brief)

    def _generate_mock_plan(self, brief: dict) -> dict:
        title = brief.get("title", "Kampanja")
        return {
            "plan_title": f"Marketing plan: {title}",
            "executive_summary": (
                f"Sveobuhvatni marketing plan za kampanju '{title}' Demo Brand. "
                f"Plan ukljucuje multi-platformski pristup s fokusom na Instagram i TikTok "
                f"sadrzaj."
            ),
            "strategy": {
                "approach": (
                    "Multi-platformski pristup s naglaskom na video sadrzaj i navijacko "
                    "angaziranje"
                ),
                "key_differentiators": [
                    "Autentican navijacki sadrzaj",
                    "Behind-the-scenes pristup",
                    "Interaktivni formati",
                ],
                "success_metrics": [
                    "Engagement rate > 3.5%",
                    "Reach > 500K",
                    "CTR > 2%",
                ],
            },
            "content_calendar": [
                {
                    "week": w,
                    "theme": (
                        f"Tjedan {w} - "
                        f"{['Najava', 'Izgradnja hype-a', 'Lansiranje', 'Odrzavanje'][w - 1]}"
                    ),
                    "posts": [
                        {
                            "platform": "instagram",
                            "format": "reel",
                            "title": f"Reel tjedan {w}",
                            "description": "Video sadrzaj za Instagram",
                            "hashtags": ["#DemoBrand", "#OurBrand"],
                            "best_time": "18:00",
                            "day": "ponedjeljak",
                        },
                        {
                            "platform": "tiktok",
                            "format": "video",
                            "title": f"TikTok tjedan {w}",
                            "description": "Kratki video za TikTok",
                            "hashtags": ["#DemoBrand", "#football"],
                            "best_time": "19:00",
                            "day": "srijeda",
                        },
                        {
                            "platform": "facebook",
                            "format": "post",
                            "title": f"FB post tjedan {w}",
                            "description": "Facebook objava s fotografijom",
                            "hashtags": ["#OurBrand"],
                            "best_time": "12:00",
                            "day": "petak",
                        },
                    ],
                }
                for w in range(1, 5)
            ],
            "budget_allocation": {
                "instagram_ads": "30%",
                "tiktok_ads": "25%",
                "youtube_ads": "15%",
                "facebook_ads": "15%",
                "influencer": "10%",
                "production": "5%",
            },
            "risk_factors": [
                "Losi sportski rezultati mogu utjecati na sentiment",
                "Zasicenost publike sadrzajem",
            ],
            "recommendations": [
                "Koristiti UGC sadrzaj navijaca",
                "A/B testirati razlicite formate",
                "Pratiti konkurenciju tjedno",
            ],
        }
