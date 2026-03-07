import logging

import httpx

from app.integrations.web_research.base import WebResearchClientBase

logger = logging.getLogger(__name__)

TAVILY_API_URL = "https://api.tavily.com"


class WebResearchClient(WebResearchClientBase):
    is_mock = False

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def health_check(self) -> dict:
        try:
            await self.search("test", max_results=1)
            return {"status": "ok", "mock": False, "service": "web_research"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def search(self, query: str, max_results: int = 5) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{TAVILY_API_URL}/search",
                json={
                    "api_key": self.api_key,
                    "query": query,
                    "max_results": max_results,
                    "search_depth": "advanced",
                    "include_answer": True,
                },
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for r in data.get("results", []):
            results.append(
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("content", "")[:500],
                    "score": r.get("score", 0),
                }
            )
        return results

    async def research_topic(self, topic: str, search_queries: list[str]) -> dict:
        all_results = []
        for q in search_queries:
            try:
                results = await self.search(q, max_results=3)
                all_results.extend(results)
            except Exception as e:
                logger.warning("Search failed for query '%s': %s", q, e)

        return {
            "topic": topic,
            "total_sources": len(all_results),
            "results": all_results,
            "summary": "",
        }
