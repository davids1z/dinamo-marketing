"""All SQLAlchemy models - imported here so Alembic can discover them."""

from app.models.base import Base, BaseModel
from app.models.market import (
    Country,
    DiasporaData,
    MarketAudience,
    MarketScore,
    SearchTrend,
    SportEvent,
)
from app.models.channel import ChannelHealthScore, ChannelMetric, SocialChannel
from app.models.competitor import Competitor, CompetitorAlert, CompetitorMetric
from app.models.fan import FanLifecycleEvent, FanProfile, FanSegment
from app.models.content import ApprovalAction, ContentPlan, ContentPost, ContentTemplate
from app.models.campaign import ABTest, Ad, AdSet, Campaign
from app.models.analytics import AdMetric, AttributionEvent, PostMetric
from app.models.sentiment import BrandMention, SentimentAlert, SentimentRecord, TrendingTopic
from app.models.engagement import FanSpotlight, Poll, PollVote, Prediction, UGCSubmission
from app.models.academy import AcademyMatch, AcademyPlayer, AcademyStat
from app.models.optimization import OptimizationLog, OptimizationRule
from app.models.report import MonthlyReport, WeeklyReport
from app.models.notification import Notification
from app.models.user import User
from app.models.client import Client, UserClient
from app.models.project import Project
from app.models.media import MediaAsset, StudioProject
from app.models.campaign_research import CampaignResearch, CampaignResearchStatus
from app.models.platform_setting import PlatformSetting
from app.models.audit_log import AuditLog
from app.models.partner import Partner

__all__ = [
    "Base",
    "BaseModel",
    "Country",
    "SportEvent",
    "MarketAudience",
    "DiasporaData",
    "SearchTrend",
    "MarketScore",
    "SocialChannel",
    "ChannelMetric",
    "ChannelHealthScore",
    "Competitor",
    "CompetitorMetric",
    "CompetitorAlert",
    "FanProfile",
    "FanSegment",
    "FanLifecycleEvent",
    "ContentPlan",
    "ContentPost",
    "ContentTemplate",
    "ApprovalAction",
    "Campaign",
    "AdSet",
    "Ad",
    "ABTest",
    "PostMetric",
    "AdMetric",
    "AttributionEvent",
    "SentimentRecord",
    "SentimentAlert",
    "BrandMention",
    "TrendingTopic",
    "Poll",
    "PollVote",
    "Prediction",
    "UGCSubmission",
    "FanSpotlight",
    "AcademyPlayer",
    "AcademyMatch",
    "AcademyStat",
    "OptimizationRule",
    "OptimizationLog",
    "WeeklyReport",
    "MonthlyReport",
    "Notification",
    "User",
    "Client",
    "UserClient",
    "Project",
    "MediaAsset",
    "StudioProject",
    "CampaignResearch",
    "CampaignResearchStatus",
    "PlatformSetting",
    "AuditLog",
]
