"""Pydantic schemas for the ShiftOneZero Marketing Platform API."""

# Common / shared
from .common import (
    DateRangeFilter,
    HealthCheck,
    MessageResponse,
    PaginatedResponse,
    PaginationParams,
)

# Market analysis
from .market import CountryOut, MarketScoreOut, ScanRequest, ScanResponse

# Social channels
from .channel import (
    AuditResponse,
    ChannelHealthScoreOut,
    ChannelMetricOut,
    SocialChannelOut,
)

# Competitor intelligence
from .competitor import (
    ComparisonResponse,
    CompetitorAlertOut,
    CompetitorMetricOut,
    CompetitorOut,
)

# Fan / CRM
from .fan import ChurnPrediction, FanProfileOut, FanSegmentOut, LifecycleEventOut

# Content planning
from .content import (
    ApprovalActionIn,
    ContentPostCreate,
    ContentPostOut,
    ContentPlanOut,
    PlanGenerateRequest,
    TemplateOut,
)

# Campaign / ads
from .campaign import ABTestOut, AdOut, AdSetOut, CampaignCreate, CampaignOut

# Analytics
from .analytics import (
    AdMetricOut,
    AttributionEventOut,
    OverviewKPIs,
    PlatformBreakdown,
    PostMetricOut,
)

# Sentiment
from .sentiment import (
    AnalyzeRequest,
    BrandMentionOut,
    SentimentAlertOut,
    SentimentOverview,
    SentimentRecordOut,
    TrendingTopicOut,
)

# Engagement
from .engagement import (
    FanLeaderboardEntry,
    PollCreate,
    PollOut,
    UGCSubmissionOut,
    UGCSubmitIn,
    VoteIn,
)

# Reporting
from .report import MonthlyReportOut, ReportGenerateRequest, WeeklyReportOut

__all__ = [
    # common
    "DateRangeFilter",
    "HealthCheck",
    "MessageResponse",
    "PaginatedResponse",
    "PaginationParams",
    # market
    "CountryOut",
    "MarketScoreOut",
    "ScanRequest",
    "ScanResponse",
    # channel
    "AuditResponse",
    "ChannelHealthScoreOut",
    "ChannelMetricOut",
    "SocialChannelOut",
    # competitor
    "ComparisonResponse",
    "CompetitorAlertOut",
    "CompetitorMetricOut",
    "CompetitorOut",
    # fan
    "ChurnPrediction",
    "FanProfileOut",
    "FanSegmentOut",
    "LifecycleEventOut",
    # content
    "ApprovalActionIn",
    "ContentPostCreate",
    "ContentPostOut",
    "ContentPlanOut",
    "PlanGenerateRequest",
    "TemplateOut",
    # campaign
    "ABTestOut",
    "AdOut",
    "AdSetOut",
    "CampaignCreate",
    "CampaignOut",
    # analytics
    "AdMetricOut",
    "AttributionEventOut",
    "OverviewKPIs",
    "PlatformBreakdown",
    "PostMetricOut",
    # sentiment
    "AnalyzeRequest",
    "BrandMentionOut",
    "SentimentAlertOut",
    "SentimentOverview",
    "SentimentRecordOut",
    "TrendingTopicOut",
    # engagement
    "FanLeaderboardEntry",
    "PollCreate",
    "PollOut",
    "UGCSubmissionOut",
    "UGCSubmitIn",
    "VoteIn",
    # report
    "MonthlyReportOut",
    "ReportGenerateRequest",
    "WeeklyReportOut",
]
