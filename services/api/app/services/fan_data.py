"""Modul 4: Fan Data Platform service."""

import logging
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select, func, case, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fan import FanLifecycleEvent, FanProfile, FanSegment

logger = logging.getLogger(__name__)

# Lifecycle stage progression
LIFECYCLE_ORDER = ["new", "casual", "engaged", "superfan", "ambassador"]

# CLV multipliers by lifecycle stage
CLV_WEIGHTS = {
    "new": 1.0,
    "casual": 2.5,
    "engaged": 5.0,
    "superfan": 12.0,
    "ambassador": 20.0,
}

# Churn risk thresholds (days since last active)
CHURN_THRESHOLDS = {
    "low": 14,
    "medium": 30,
    "high": 60,
    "critical": 90,
}


class FanDataService:
    def __init__(self, claude_client):
        self.claude_client = claude_client

    async def get_segments(self, db: AsyncSession, client_id: UUID | None = None) -> list[dict]:
        """Return all fan segments with their current sizes and metrics."""
        query = select(FanSegment)
        if client_id:
            query = query.where(FanSegment.client_id == client_id)
        query = query.order_by(FanSegment.size.desc())
        result = await db.execute(query)
        segments = result.scalars().all()

        if not segments:
            logger.info("No segments found; returning default segments")
            return [
                {
                    "name": "Croatian Ultras",
                    "size": 0,
                    "avg_clv": 0.0,
                    "churn_rate": 0.0,
                    "growth_trend": 0.0,
                    "criteria": {},
                },
                {
                    "name": "Diaspora Fans",
                    "size": 0,
                    "avg_clv": 0.0,
                    "churn_rate": 0.0,
                    "growth_trend": 0.0,
                    "criteria": {},
                },
                {
                    "name": "CL Casuals",
                    "size": 0,
                    "avg_clv": 0.0,
                    "churn_rate": 0.0,
                    "growth_trend": 0.0,
                    "criteria": {},
                },
            ]

        return [
            {
                "id": str(seg.id),
                "name": seg.name,
                "size": seg.size,
                "avg_clv": seg.avg_clv,
                "churn_rate": seg.churn_rate,
                "growth_trend": seg.growth_trend,
                "criteria": seg.criteria or {},
            }
            for seg in segments
        ]

    async def get_fan_profile(self, db: AsyncSession, fan_id: UUID, client_id: UUID | None = None) -> dict:
        """Get a single fan profile with lifecycle history."""
        fan = await db.get(FanProfile, fan_id)
        if not fan:
            raise ValueError(f"Fan {fan_id} not found")

        # Get lifecycle events
        events_result = await db.execute(
            select(FanLifecycleEvent)
            .where(FanLifecycleEvent.fan_id == fan_id)
            .order_by(FanLifecycleEvent.occurred_at.desc())
        )
        events = events_result.scalars().all()

        # Calculate days since last active
        days_inactive = (datetime.utcnow() - fan.last_active).days if fan.last_active else 0

        # Determine churn risk
        churn_risk = "low"
        for risk, threshold in sorted(CHURN_THRESHOLDS.items(), key=lambda x: x[1], reverse=True):
            if days_inactive >= threshold:
                churn_risk = risk
                break

        return {
            "id": str(fan.id),
            "name": fan.name,
            "email": fan.email,
            "country": fan.country,
            "city": fan.city,
            "age_range": fan.age_range,
            "platforms": fan.platforms or {},
            "lifecycle_stage": fan.lifecycle_stage,
            "clv_score": fan.clv_score,
            "first_seen": fan.first_seen.isoformat() if fan.first_seen else None,
            "last_active": fan.last_active.isoformat() if fan.last_active else None,
            "days_inactive": days_inactive,
            "churn_risk": churn_risk,
            "lifecycle_history": [
                {
                    "from_stage": e.from_stage,
                    "to_stage": e.to_stage,
                    "trigger": e.trigger,
                    "occurred_at": e.occurred_at.isoformat(),
                }
                for e in events
            ],
        }

    async def update_lifecycle_stages(self, db: AsyncSession, client_id: UUID | None = None) -> dict:
        """Batch update fan lifecycle stages based on activity signals."""
        now = datetime.utcnow()
        promotions = 0
        demotions = 0

        # Promote: fans active in last 7 days with high engagement -> move up
        seven_days_ago = now - timedelta(days=7)
        promo_filters = [FanProfile.last_active >= seven_days_ago, FanProfile.lifecycle_stage.in_(["new", "casual", "engaged"])]
        if client_id:
            promo_filters.append(FanProfile.client_id == client_id)
        active_fans_result = await db.execute(
            select(FanProfile).where(*promo_filters)
        )
        active_fans = active_fans_result.scalars().all()

        for fan in active_fans:
            current_idx = LIFECYCLE_ORDER.index(fan.lifecycle_stage)
            if current_idx < len(LIFECYCLE_ORDER) - 1:
                new_stage = LIFECYCLE_ORDER[current_idx + 1]
                event = FanLifecycleEvent(
                    fan_id=fan.id,
                    from_stage=fan.lifecycle_stage,
                    to_stage=new_stage,
                    trigger="engagement_increase",
                )
                db.add(event)
                fan.lifecycle_stage = new_stage
                promotions += 1

        # Demote: fans inactive for 60+ days -> move down
        sixty_days_ago = now - timedelta(days=60)
        demo_filters = [FanProfile.last_active < sixty_days_ago, FanProfile.lifecycle_stage.in_(["engaged", "superfan", "ambassador"])]
        if client_id:
            demo_filters.append(FanProfile.client_id == client_id)
        inactive_fans_result = await db.execute(
            select(FanProfile).where(*demo_filters)
        )
        inactive_fans = inactive_fans_result.scalars().all()

        for fan in inactive_fans:
            current_idx = LIFECYCLE_ORDER.index(fan.lifecycle_stage)
            if current_idx > 0:
                new_stage = LIFECYCLE_ORDER[current_idx - 1]
                event = FanLifecycleEvent(
                    fan_id=fan.id,
                    from_stage=fan.lifecycle_stage,
                    to_stage=new_stage,
                    trigger="inactivity_demotion",
                )
                db.add(event)
                fan.lifecycle_stage = new_stage
                demotions += 1

        await db.flush()
        logger.info(f"Lifecycle update: {promotions} promotions, {demotions} demotions")

        return {
            "promotions": promotions,
            "demotions": demotions,
            "total_processed": len(active_fans) + len(inactive_fans),
            "updated_at": now.isoformat(),
        }

    async def calculate_clv(self, db: AsyncSession, client_id: UUID | None = None) -> list[dict]:
        """Calculate Customer Lifetime Value by segment."""
        query = select(
            FanProfile.lifecycle_stage,
            func.count(FanProfile.id).label("count"),
            func.avg(FanProfile.clv_score).label("avg_clv"),
        )
        if client_id:
            query = query.where(FanProfile.client_id == client_id)
        query = query.group_by(FanProfile.lifecycle_stage)
        result = await db.execute(query)
        rows = result.all()

        if not rows:
            return [
                {
                    "lifecycle_stage": stage,
                    "count": 0,
                    "avg_clv": 0.0,
                    "weighted_clv": 0.0,
                }
                for stage in LIFECYCLE_ORDER
            ]

        # Update CLV scores based on lifecycle weights
        for row in rows:
            weight = CLV_WEIGHTS.get(row.lifecycle_stage, 1.0)
            base_clv = float(row.avg_clv) if row.avg_clv else 0.0
            upd_filters = [FanProfile.lifecycle_stage == row.lifecycle_stage]
            if client_id:
                upd_filters.append(FanProfile.client_id == client_id)
            await db.execute(
                update(FanProfile)
                .where(*upd_filters)
                .values(clv_score=base_clv * weight)
            )

        await db.flush()

        return [
            {
                "lifecycle_stage": row.lifecycle_stage,
                "count": row.count,
                "avg_clv": round(float(row.avg_clv) if row.avg_clv else 0.0, 2),
                "weighted_clv": round(
                    (float(row.avg_clv) if row.avg_clv else 0.0)
                    * CLV_WEIGHTS.get(row.lifecycle_stage, 1.0),
                    2,
                ),
            }
            for row in rows
        ]

    async def get_churn_predictions(self, db: AsyncSession, client_id: UUID | None = None) -> list[dict]:
        """Predict churn risk for fans based on inactivity patterns."""
        now = datetime.utcnow()
        predictions = []

        for risk_label, threshold_days in sorted(
            CHURN_THRESHOLDS.items(), key=lambda x: x[1], reverse=True
        ):
            cutoff = now - timedelta(days=threshold_days)

            filters = [FanProfile.last_active < cutoff]
            if client_id:
                filters.append(FanProfile.client_id == client_id)
            result = await db.execute(
                select(
                    func.count(FanProfile.id).label("count"),
                    func.avg(FanProfile.clv_score).label("avg_clv"),
                )
                .where(*filters)
            )
            row = result.one()

            predictions.append({
                "risk_level": risk_label,
                "days_inactive_threshold": threshold_days,
                "fan_count": row.count or 0,
                "avg_clv_at_risk": round(float(row.avg_clv) if row.avg_clv else 0.0, 2),
                "estimated_revenue_at_risk": round(
                    (row.count or 0) * (float(row.avg_clv) if row.avg_clv else 0.0), 2
                ),
            })

        # Ask Claude for re-engagement suggestions for highest-risk group
        if predictions and predictions[0]["fan_count"] > 0:
            try:
                suggestions = await self.claude_client.generate_reengagement_ideas(
                    risk_level=predictions[0]["risk_level"],
                    fan_count=predictions[0]["fan_count"],
                )
                predictions[0]["reengagement_suggestions"] = suggestions
            except Exception as exc:
                logger.error(f"Failed to generate re-engagement suggestions: {exc}")

        logger.info(f"Generated churn predictions across {len(predictions)} risk levels")
        return predictions
