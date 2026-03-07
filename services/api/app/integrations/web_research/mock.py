import asyncio

from app.integrations.web_research.base import WebResearchClientBase


class WebResearchMockClient(WebResearchClientBase):
    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "mock": True, "service": "web_research"}

    async def search(self, query: str, max_results: int = 5) -> list[dict]:
        await asyncio.sleep(0.5)  # Simulate delay
        return [
            {
                "title": f"Primjer rezultata za: {query}",
                "url": "https://example.com/article-1",
                "snippet": (
                    "Ovo je primjer rezultata pretrage koji bi Tavily API vratio za uneseni "
                    "upit. Sadrzi relevantne informacije o kampanjama nogometnih klubova."
                ),
                "score": 0.95,
            },
            {
                "title": "Social Media Campaign Benchmarks 2026 - Football Clubs",
                "url": "https://example.com/benchmarks",
                "snippet": (
                    "Average engagement rate for football clubs: Instagram 3.2%, TikTok 5.8%, "
                    "Facebook 1.4%. Top performing content types: matchday behind-the-scenes, "
                    "player features, fan UGC."
                ),
                "score": 0.88,
            },
            {
                "title": "Celtic FC - Transfer Window Campaign Case Study",
                "url": "https://example.com/celtic-case-study",
                "snippet": (
                    "Celtic FC generated 2.3M impressions across social platforms during their "
                    "summer transfer campaign. Key tactics included teaser videos, countdown "
                    "timers, and fan voting polls."
                ),
                "score": 0.82,
            },
            {
                "title": "Red Bull Salzburg - Season Ticket Marketing Strategy",
                "url": "https://example.com/salzburg-tickets",
                "snippet": (
                    "Red Bull Salzburg achieved 94% renewal rate using personalized email "
                    "sequences, exclusive content previews, and early-bird pricing tiers "
                    "with tiered loyalty rewards."
                ),
                "score": 0.78,
            },
            {
                "title": "UEFA Club Marketing Best Practices 2025-2026",
                "url": "https://example.com/uefa-marketing",
                "snippet": (
                    "UEFA recommends multi-platform content distribution, localised content "
                    "for diaspora audiences, and data-driven posting schedules. Average CTR "
                    "improvement: 23% with AI-optimized timing."
                ),
                "score": 0.75,
            },
        ][:max_results]

    async def research_topic(self, topic: str, search_queries: list[str]) -> dict:
        all_results = []
        for q in search_queries:
            results = await self.search(q, max_results=3)
            all_results.extend(results)

        return {
            "topic": topic,
            "total_sources": len(all_results),
            "results": all_results,
            "summary": (
                f"Istrazivanje teme '{topic}' pronaslo je {len(all_results)} relevantnih "
                f"izvora. Kljucni nalazi ukazuju na vaznost multi-platformskog pristupa, "
                f"personaliziranog sadrzaja i data-driven strategija za nogometne klubove "
                f"slicnog profila."
            ),
        }
