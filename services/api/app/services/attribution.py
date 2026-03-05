"""Modul 16: Multi-Touch Attribution Engine service."""

import logging
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AttributionEvent

logger = logging.getLogger(__name__)

# Attribution model weights
ATTRIBUTION_MODELS = {
    "first_touch": "100% credit to first channel in sequence",
    "last_touch": "100% credit to last channel in sequence",
    "linear": "Equal credit across all channels",
    "time_decay": "More credit to channels closer to conversion",
}

# Time decay half-life in days
TIME_DECAY_HALF_LIFE = 7

# Supported conversion types
CONVERSION_TYPES = [
    "ticket_purchase",
    "merch_purchase",
    "registration",
    "newsletter_signup",
    "app_install",
    "membership",
]


class AttributionService:
    def __init__(self):
        pass

    async def track_event(self, db: AsyncSession, data: dict) -> dict:
        """Track an attribution event (conversion with channel sequence)."""
        channel_sequence = data.get("channel_sequence", [])

        if not channel_sequence:
            raise ValueError("channel_sequence is required and must not be empty")

        event = AttributionEvent(
            fan_id=data.get("fan_id"),
            channel_sequence=channel_sequence,
            first_touch_channel=channel_sequence[0],
            last_touch_channel=channel_sequence[-1],
            conversion_type=data.get("conversion_type", "registration"),
            conversion_value=data.get("conversion_value", 0.0),
        )
        db.add(event)
        await db.flush()

        logger.info(
            f"Attribution event tracked: {event.conversion_type} "
            f"value={event.conversion_value} "
            f"sequence={' -> '.join(channel_sequence)}"
        )

        return {
            "event_id": str(event.id),
            "fan_id": str(event.fan_id) if event.fan_id else None,
            "channel_sequence": channel_sequence,
            "first_touch": event.first_touch_channel,
            "last_touch": event.last_touch_channel,
            "conversion_type": event.conversion_type,
            "conversion_value": event.conversion_value,
        }

    async def get_attribution_report(self, db: AsyncSession, days: int = 30) -> dict:
        """Generate multi-model attribution report."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = await db.execute(
            select(AttributionEvent)
            .where(AttributionEvent.occurred_at >= cutoff)
        )
        events = result.scalars().all()

        if not events:
            return {
                "period_days": days,
                "total_conversions": 0,
                "total_value": 0.0,
                "models": {model: {} for model in ATTRIBUTION_MODELS},
                "message": "No attribution events found for this period",
            }

        total_value = sum(e.conversion_value for e in events)
        total_conversions = len(events)

        # First-touch attribution
        first_touch: dict = {}
        for event in events:
            ch = event.first_touch_channel
            if ch not in first_touch:
                first_touch[ch] = {"conversions": 0, "value": 0.0}
            first_touch[ch]["conversions"] += 1
            first_touch[ch]["value"] += event.conversion_value

        # Last-touch attribution
        last_touch: dict = {}
        for event in events:
            ch = event.last_touch_channel
            if ch not in last_touch:
                last_touch[ch] = {"conversions": 0, "value": 0.0}
            last_touch[ch]["conversions"] += 1
            last_touch[ch]["value"] += event.conversion_value

        # Linear attribution
        linear: dict = {}
        for event in events:
            sequence = event.channel_sequence or []
            if not sequence:
                continue
            share = event.conversion_value / len(sequence)
            for ch in sequence:
                if ch not in linear:
                    linear[ch] = {"conversions": 0.0, "value": 0.0}
                linear[ch]["conversions"] += 1.0 / len(sequence)
                linear[ch]["value"] += share

        # Time-decay attribution
        time_decay: dict = {}
        for event in events:
            sequence = event.channel_sequence or []
            if not sequence:
                continue
            # Assign exponentially increasing weights
            weights = []
            for i in range(len(sequence)):
                weight = 2 ** (i / max(len(sequence) - 1, 1))
                weights.append(weight)
            total_weight = sum(weights)
            for ch, weight in zip(sequence, weights):
                if ch not in time_decay:
                    time_decay[ch] = {"conversions": 0.0, "value": 0.0}
                normalized = weight / total_weight
                time_decay[ch]["conversions"] += normalized
                time_decay[ch]["value"] += event.conversion_value * normalized

        # Round all values
        for model_data in [first_touch, last_touch, linear, time_decay]:
            for ch_data in model_data.values():
                ch_data["conversions"] = round(ch_data["conversions"], 2)
                ch_data["value"] = round(ch_data["value"], 2)

        # Conversion type breakdown
        type_result = await db.execute(
            select(
                AttributionEvent.conversion_type,
                func.count(AttributionEvent.id).label("count"),
                func.sum(AttributionEvent.conversion_value).label("total_value"),
            )
            .where(AttributionEvent.occurred_at >= cutoff)
            .group_by(AttributionEvent.conversion_type)
        )
        type_breakdown = [
            {
                "conversion_type": row.conversion_type,
                "count": row.count,
                "total_value": round(float(row.total_value or 0), 2),
            }
            for row in type_result
        ]

        return {
            "period_days": days,
            "total_conversions": total_conversions,
            "total_value": round(total_value, 2),
            "models": {
                "first_touch": first_touch,
                "last_touch": last_touch,
                "linear": linear,
                "time_decay": time_decay,
            },
            "conversion_type_breakdown": type_breakdown,
        }

    async def get_channel_contribution(self, db: AsyncSession) -> dict:
        """Get each channel's contribution across the full funnel."""
        result = await db.execute(select(AttributionEvent))
        events = result.scalars().all()

        if not events:
            return {
                "channels": {},
                "total_events": 0,
                "message": "No attribution data available",
            }

        channels: dict = {}

        for event in events:
            sequence = event.channel_sequence or []
            for idx, ch in enumerate(sequence):
                if ch not in channels:
                    channels[ch] = {
                        "first_touch_count": 0,
                        "last_touch_count": 0,
                        "assist_count": 0,
                        "total_appearances": 0,
                        "total_value_influenced": 0.0,
                        "avg_position_in_sequence": 0.0,
                        "_position_sum": 0,
                        "_position_count": 0,
                    }

                channels[ch]["total_appearances"] += 1
                channels[ch]["total_value_influenced"] += event.conversion_value
                channels[ch]["_position_sum"] += idx
                channels[ch]["_position_count"] += 1

                if idx == 0:
                    channels[ch]["first_touch_count"] += 1
                elif idx == len(sequence) - 1:
                    channels[ch]["last_touch_count"] += 1
                else:
                    channels[ch]["assist_count"] += 1

        # Calculate average position and clean up internal fields
        for ch, data in channels.items():
            if data["_position_count"] > 0:
                data["avg_position_in_sequence"] = round(
                    data["_position_sum"] / data["_position_count"], 2
                )
            data["total_value_influenced"] = round(data["total_value_influenced"], 2)
            del data["_position_sum"]
            del data["_position_count"]

        # Sort by total appearances
        sorted_channels = dict(
            sorted(channels.items(), key=lambda x: x[1]["total_appearances"], reverse=True)
        )

        # Top conversion paths
        path_counter: dict = {}
        for event in events:
            path_key = " -> ".join(event.channel_sequence or [])
            if path_key not in path_counter:
                path_counter[path_key] = {"count": 0, "total_value": 0.0}
            path_counter[path_key]["count"] += 1
            path_counter[path_key]["total_value"] += event.conversion_value

        top_paths = sorted(
            [
                {"path": k, "count": v["count"], "total_value": round(v["total_value"], 2)}
                for k, v in path_counter.items()
            ],
            key=lambda x: x["count"],
            reverse=True,
        )[:10]

        return {
            "channels": sorted_channels,
            "total_events": len(events),
            "top_conversion_paths": top_paths,
        }
