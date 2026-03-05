"""Dependency injection factory: resolves mock vs real API clients based on config."""

from functools import lru_cache

from app.config import settings


@lru_cache
def get_meta_client():
    if settings.use_mock("meta"):
        from app.integrations.meta.mock import MetaMockClient
        return MetaMockClient()
    from app.integrations.meta.client import MetaClient
    return MetaClient(
        app_id=settings.META_APP_ID,
        app_secret=settings.META_APP_SECRET,
        access_token=settings.META_ACCESS_TOKEN,
        ad_account_id=settings.META_AD_ACCOUNT_ID,
        page_id=settings.META_PAGE_ID,
        instagram_account_id=settings.META_INSTAGRAM_ACCOUNT_ID,
    )


@lru_cache
def get_tiktok_client():
    if settings.use_mock("tiktok"):
        from app.integrations.tiktok.mock import TikTokMockClient
        return TikTokMockClient()
    from app.integrations.tiktok.client import TikTokClient
    return TikTokClient(
        app_id=settings.TIKTOK_APP_ID,
        app_secret=settings.TIKTOK_APP_SECRET,
        access_token=settings.TIKTOK_ACCESS_TOKEN,
        advertiser_id=settings.TIKTOK_ADVERTISER_ID,
    )


@lru_cache
def get_youtube_client():
    if settings.use_mock("youtube"):
        from app.integrations.youtube.mock import YouTubeMockClient
        return YouTubeMockClient()
    from app.integrations.youtube.client import YouTubeClient
    return YouTubeClient(
        api_key=settings.YOUTUBE_API_KEY,
        channel_id=settings.YOUTUBE_CHANNEL_ID,
    )


@lru_cache
def get_ga4_client():
    if settings.use_mock("ga4"):
        from app.integrations.google_analytics.mock import GA4MockClient
        return GA4MockClient()
    from app.integrations.google_analytics.client import GA4Client
    return GA4Client(
        property_id=settings.GA4_PROPERTY_ID,
        credentials_json=settings.GA4_CREDENTIALS_JSON,
    )


@lru_cache
def get_sports_data_client():
    if settings.use_mock("sports_data"):
        from app.integrations.sports_data.mock import SportsDataMockClient
        return SportsDataMockClient()
    from app.integrations.sports_data.client import SportsDataClient
    return SportsDataClient(
        sportradar_key=settings.SPORTRADAR_API_KEY,
        thesportsdb_key=settings.THESPORTSDB_API_KEY,
    )


@lru_cache
def get_claude_client():
    if settings.use_mock("claude"):
        from app.integrations.claude_ai.mock import ClaudeMockClient
        return ClaudeMockClient()
    from app.integrations.claude_ai.client import ClaudeClient
    return ClaudeClient(api_key=settings.ANTHROPIC_API_KEY)


@lru_cache
def get_buffer_client():
    if settings.use_mock("buffer"):
        from app.integrations.buffer.mock import BufferMockClient
        return BufferMockClient()
    from app.integrations.buffer.client import BufferClient
    return BufferClient(access_token=settings.BUFFER_ACCESS_TOKEN)


@lru_cache
def get_image_gen_client():
    if settings.use_mock("image_gen"):
        from app.integrations.image_gen.mock import ImageGenMockClient
        return ImageGenMockClient()
    from app.integrations.image_gen.client import ImageGenClient
    return ImageGenClient(
        openai_key=settings.OPENAI_API_KEY,
        stability_key=settings.STABILITY_API_KEY,
    )


@lru_cache
def get_trends_client():
    if settings.use_mock("trends"):
        from app.integrations.trends.mock import TrendsMockClient
        return TrendsMockClient()
    from app.integrations.trends.client import TrendsClient
    return TrendsClient()
