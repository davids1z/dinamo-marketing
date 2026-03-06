from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Dinamo Marketing Platform"
    APP_SECRET_KEY: str = "change-this-to-a-random-secret-key"
    CORS_ORIGINS: str = "http://localhost:3001"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dinamo:dinamo@localhost:5433/dinamo_marketing"
    DATABASE_URL_SYNC: str = "postgresql://dinamo:dinamo@localhost:5433/dinamo_marketing"

    # Redis
    REDIS_URL: str = "redis://localhost:6380/0"
    CELERY_BROKER_URL: str = "redis://localhost:6380/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6380/2"

    # Mock System
    DM_USE_MOCK_APIS: bool = True
    DM_USE_REAL_CLAUDE: bool = False
    DM_USE_REAL_META: bool = False
    DM_USE_REAL_TIKTOK: bool = False
    DM_USE_REAL_YOUTUBE: bool = False
    DM_USE_REAL_GA4: bool = False
    DM_USE_REAL_SPORTS_DATA: bool = False
    DM_USE_REAL_BUFFER: bool = False
    DM_USE_REAL_IMAGE_GEN: bool = False
    DM_USE_REAL_TRENDS: bool = False

    # OpenRouter (Gemini 2.5 Pro)
    OPENROUTER_API_KEY: str = ""

    # Claude / Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Meta
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_ACCESS_TOKEN: str = ""
    META_AD_ACCOUNT_ID: str = ""
    META_PAGE_ID: str = ""
    META_INSTAGRAM_ACCOUNT_ID: str = ""

    # TikTok
    TIKTOK_APP_ID: str = ""
    TIKTOK_APP_SECRET: str = ""
    TIKTOK_ACCESS_TOKEN: str = ""
    TIKTOK_ADVERTISER_ID: str = ""

    # YouTube
    YOUTUBE_API_KEY: str = ""
    YOUTUBE_CHANNEL_ID: str = ""

    # Google Analytics 4
    GA4_PROPERTY_ID: str = ""
    GA4_CREDENTIALS_JSON: str = ""

    # SportRadar
    SPORTRADAR_API_KEY: str = ""

    # TheSportsDB
    THESPORTSDB_API_KEY: str = "123"

    # Buffer
    BUFFER_ACCESS_TOKEN: str = ""
    BUFFER_CLIENT_ID: str = ""
    BUFFER_CLIENT_SECRET: str = ""

    # Telegram (test publishing)
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHANNEL_ID: str = ""

    # Image Generation
    OPENAI_API_KEY: str = ""
    STABILITY_API_KEY: str = ""

    # Media Storage
    MEDIA_ROOT: str = "./media"

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    NOTIFICATION_EMAIL: str = ""

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = "60/minute"
    RATE_LIMIT_HEAVY: str = "10/minute"
    RATE_LIMIT_ENABLED: bool = True

    # Caching (TTL in seconds)
    CACHE_TTL_DASHBOARD: int = 300
    CACHE_TTL_ANALYTICS: int = 600
    CACHE_TTL_REPORTS: int = 1800

    # Circuit Breaker
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: int = 60

    # API Quotas (daily limits, 0 = unlimited)
    QUOTA_META_DAILY: int = 200
    QUOTA_TIKTOK_DAILY: int = 100
    QUOTA_YOUTUBE_DAILY: int = 10000
    QUOTA_CLAUDE_DAILY: int = 500
    QUOTA_SPORTS_DATA_DAILY: int = 100
    QUOTA_IMAGE_GEN_DAILY: int = 50

    # Observability
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_ENVIRONMENT: str = "development"
    LOG_FORMAT: str = "text"
    LOG_LEVEL: str = "INFO"

    def use_mock(self, service: str) -> bool:
        """Check if a specific service should use mock data."""
        if self.DM_USE_MOCK_APIS:
            real_override = getattr(self, f"DM_USE_REAL_{service.upper()}", False)
            return not real_override
        return False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
