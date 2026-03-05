"""Service layer: business logic for all 18 modules."""

from app.services.market_research import MarketResearchService
from app.services.channel_audit import ChannelAuditService
from app.services.competitor_intel import CompetitorIntelService
from app.services.fan_data import FanDataService
from app.services.content_engine import ContentEngineService
from app.services.campaign_manager import CampaignManagerService
from app.services.optimization_engine import OptimizationEngineService
from app.services.sentiment_analyzer import SentimentAnalyzerService
from app.services.social_listener import SocialListenerService
from app.services.academy_content import AcademyContentService
from app.services.diaspora_manager import DiasporaManagerService
from app.services.cl_surge import CLSurgeService
from app.services.analytics_aggregator import AnalyticsAggregatorService
from app.services.report_generator import ReportGeneratorService
from app.services.fan_engagement import FanEngagementService
from app.services.attribution import AttributionService

__all__ = [
    "MarketResearchService",
    "ChannelAuditService",
    "CompetitorIntelService",
    "FanDataService",
    "ContentEngineService",
    "CampaignManagerService",
    "OptimizationEngineService",
    "SentimentAnalyzerService",
    "SocialListenerService",
    "AcademyContentService",
    "DiasporaManagerService",
    "CLSurgeService",
    "AnalyticsAggregatorService",
    "ReportGeneratorService",
    "FanEngagementService",
    "AttributionService",
]
