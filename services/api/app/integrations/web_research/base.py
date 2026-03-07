from abc import abstractmethod

from app.integrations.base import BaseIntegrationClient


class WebResearchClientBase(BaseIntegrationClient):
    """Base class for web research API clients."""

    @abstractmethod
    async def search(self, query: str, max_results: int = 5) -> list[dict]:
        """Search the web and return structured results."""
        ...

    @abstractmethod
    async def research_topic(self, topic: str, search_queries: list[str]) -> dict:
        """Research a topic with multiple queries, return compiled results."""
        ...
