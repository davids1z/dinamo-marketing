import random
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_client, get_meta_client, get_claude_client
from app.services.social_listener import SocialListenerService
from app.models.sentiment import BrandMention, TrendingTopic

router = APIRouter()


def _get_service():
    return SocialListenerService(
        get_meta_client(),
        get_claude_client(),
    )


# ------------------------------------------------------------------
# Estimate data generator
# ------------------------------------------------------------------

def _generate_estimate_data(
    client_id,
    client_name: str,
    connected_platforms: list[str],
    hashtags: list[str],
    competitor_names: list[str],
    days: int = 7,
) -> dict:
    """Generate realistic estimated social listening data."""
    rng = random.Random(f"listening-{client_id}")
    channel_count = max(len(connected_platforms), 1)

    # Metrics
    total_mentions = rng.randint(30, 200) * channel_count
    prev_mentions = int(total_mentions * rng.uniform(0.7, 1.1))
    pos_mentions = int(total_mentions * rng.uniform(0.5, 0.7))
    neg_mentions = int(total_mentions * rng.uniform(0.05, 0.15))
    neu_mentions = total_mentions - pos_mentions - neg_mentions
    share_of_voice = round(pos_mentions / max(total_mentions, 1) * 100)
    prev_sov = round(share_of_voice * rng.uniform(0.85, 1.05))

    # Mention volume (14 days)
    mention_volume = []
    for i in range(14):
        d = datetime.utcnow() - timedelta(days=13 - i)
        vol = int(total_mentions / 7 * rng.uniform(0.5, 1.5))
        mention_volume.append({
            "date": d.strftime("%Y-%m-%d"),
            "mentions": vol,
        })

    # Sentiment timeline (14 days)
    sentiment_timeline = []
    for i in range(14):
        d = datetime.utcnow() - timedelta(days=13 - i)
        pos = rng.randint(50, 75)
        neg = rng.randint(5, 18)
        sentiment_timeline.append({
            "date": d.strftime("%Y-%m-%d"),
            "positive": pos,
            "neutral": 100 - pos - neg,
            "negative": neg,
        })

    # Recent mentions
    plat_names = {
        "instagram": "Instagram", "facebook": "Facebook",
        "tiktok": "TikTok", "youtube": "YouTube",
        "twitter": "X / Twitter", "linkedin": "LinkedIn",
    }
    mention_templates = [
        {"text": f"Upravo sam isprobao {client_name} - stvarno odličan proizvod! Preporučujem svima.", "sentiment": "positive", "reach": rng.randint(500, 5000)},
        {"text": f"Netko je probao {client_name}? Razmišljam o kupnji, trebam savjet.", "sentiment": "neutral", "reach": rng.randint(200, 3000)},
        {"text": f"Hvala {client_name} na brzoj dostavi! Sve je stiglo u savršenom stanju.", "sentiment": "positive", "reach": rng.randint(300, 4000)},
        {"text": f"Vidio sam reklamu za {client_name}, zanimljiv koncept. Ima tko iskustva?", "sentiment": "neutral", "reach": rng.randint(1000, 8000)},
        {"text": f"Odlična kvaliteta! {client_name} nikad ne razočara.", "sentiment": "positive", "reach": rng.randint(400, 6000)},
        {"text": f"{client_name} cijena mogla bi biti pristupačnija, ali kvaliteta je tu.", "sentiment": "neutral", "reach": rng.randint(300, 2500)},
        {"text": f"Čekam narudžbu od {client_name} već 5 dana. Komunikacija mogla biti bolja.", "sentiment": "negative", "reach": rng.randint(200, 1500)},
        {"text": f"Super iskustvo s {client_name}! Definitivno ću opet naručiti.", "sentiment": "positive", "reach": rng.randint(500, 4000)},
        {"text": f"Novi proizvod od {client_name} izgleda obećavajuće. Tko je već probao?", "sentiment": "neutral", "reach": rng.randint(800, 5000)},
        {"text": f"Razočaran sam s korisničkom podrškom {client_name}. Trebalo je 3 dana da odgovore.", "sentiment": "negative", "reach": rng.randint(300, 2000)},
    ]

    recent_mentions = []
    for i, tmpl in enumerate(mention_templates):
        plat = connected_platforms[i % len(connected_platforms)] if connected_platforms else "instagram"
        hours_ago = rng.randint(1, 72)
        if hours_ago < 1:
            time_str = "upravo"
        elif hours_ago < 24:
            time_str = f"prije {hours_ago} sati"
        else:
            time_str = f"prije {hours_ago // 24} dana"
        recent_mentions.append({
            "id": i + 1,
            "platform": plat,
            "author": f"@korisnik_{rng.randint(100, 9999)}",
            "text": tmpl["text"],
            "sentiment": tmpl["sentiment"],
            "time": time_str,
            "reach": tmpl["reach"],
        })

    # Trending topics
    topic_templates = [
        ("Kvaliteta proizvoda", 85, 22),
        ("Korisničko iskustvo", 65, 15),
        ("Novi proizvodi", 50, 35),
        ("Dostava i logistika", 40, -5),
        ("Cijena i vrijednost", 35, 8),
        ("Marketing kampanja", 30, 42),
        ("Održivost", 25, 28),
    ]

    # Add hashtags as topics
    for tag in hashtags[:3]:
        tag_name = tag.replace("#", "")
        topic_templates.append((tag_name, rng.randint(15, 60), rng.randint(5, 40)))

    trending_topics = []
    for i, (name, base_vol, growth) in enumerate(topic_templates[:10]):
        vol = int(base_vol * rng.uniform(0.7, 1.3) * channel_count)
        g = growth + rng.randint(-5, 5)
        if g > 30:
            velocity = "u porastu"
        elif g > 10:
            velocity = "raste"
        else:
            velocity = "stabilno"
        trending_topics.append({
            "id": i + 1,
            "topic": name,
            "mentions": vol,
            "change": f"+{g}%" if g >= 0 else f"{g}%",
            "velocity": velocity,
        })

    # Competitor mentions (use real competitor names or defaults)
    comp_data = []
    comp_data.append({
        "name": client_name,
        "mentions": total_mentions,
        "color": "#0EA5E9",
    })
    comp_colors = ["#EF4444", "#F59E0B", "#8B5CF6", "#22C55E"]
    for i, comp_name in enumerate(competitor_names[:4]):
        comp_data.append({
            "name": comp_name,
            "mentions": rng.randint(int(total_mentions * 0.3), int(total_mentions * 1.2)),
            "color": comp_colors[i % len(comp_colors)],
        })
    comp_data.sort(key=lambda x: -x["mentions"])

    # Source breakdown
    source_breakdown = []
    total_source = 0
    for plat in connected_platforms:
        pct = rng.randint(15, 45)
        source_breakdown.append({
            "platform": plat,
            "name": plat_names.get(plat, plat.capitalize()),
            "percentage": pct,
            "mentions": int(total_mentions * pct / 100),
        })
        total_source += pct
    # Normalize
    if source_breakdown and total_source > 0:
        for s in source_breakdown:
            s["percentage"] = round(s["percentage"] / total_source * 100)
            s["mentions"] = int(total_mentions * s["percentage"] / 100)

    return {
        "metrics": {
            "totalMentions": total_mentions,
            "prevMentions": prev_mentions,
            "shareOfVoice": share_of_voice,
            "prevShareOfVoice": prev_sov,
            "trendingCount": len(trending_topics),
            "sentimentPositive": pos_mentions,
            "sentimentNeutral": neu_mentions,
            "sentimentNegative": neg_mentions,
        },
        "recentMentions": recent_mentions,
        "trendingTopics": trending_topics,
        "sentimentTimeline": sentiment_timeline,
        "mentionVolume": mention_volume,
        "competitorMentions": comp_data,
        "sourceBreakdown": source_breakdown,
        "_meta": {
            "is_estimate": True,
            "connected_platforms": connected_platforms,
            "tracked_keywords": [client_name] + [f"#{h.replace('#','')}" for h in hashtags[:5]],
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


@router.post("/scan")
async def scan_brand_mentions(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.scan_brand_mentions(db)
    return result


@router.get("/trending")
async def get_trending_page_data(
    days: int = Query(default=7),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns full data for the Social Listening page."""
    user, client, role = ctx
    cutoff = datetime.utcnow() - timedelta(days=days)
    prev_cutoff = datetime.utcnow() - timedelta(days=days * 2)

    # Total mentions (current period)
    total_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(BrandMention.detected_at >= cutoff, BrandMention.client_id == client.id)
    )
    total_mentions = total_result.scalar() or 0

    # If no real data, check for social_handles and generate estimates
    if total_mentions == 0:
        connected_platforms: list[str] = []
        if client.social_handles and isinstance(client.social_handles, dict):
            for platform, url in client.social_handles.items():
                if url and isinstance(url, str) and url.strip():
                    connected_platforms.append(platform)

        if connected_platforms:
            # No real data — return empty structure instead of fake estimates
            return {
                "metrics": {
                    "totalMentions": 0,
                    "prevMentions": 0,
                    "shareOfVoice": 0,
                    "prevShareOfVoice": 0,
                    "trendingCount": 0,
                    "sentimentPositive": 0,
                    "sentimentNeutral": 0,
                    "sentimentNegative": 0,
                },
                "recentMentions": [],
                "trendingTopics": [],
                "sentimentTimeline": [],
                "mentionVolume": [],
                "competitorMentions": [],
                "sourceBreakdown": [],
                "_meta": {
                    "is_estimate": False,
                    "connected_platforms": connected_platforms,
                    "tracked_keywords": [],
                    "analyzed_at": datetime.utcnow().isoformat(),
                },
            }

    # --- Real data flow ---
    # Total mentions (previous period)
    prev_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(
            BrandMention.detected_at >= prev_cutoff,
            BrandMention.detected_at < cutoff,
            BrandMention.client_id == client.id,
        )
    )
    prev_mentions = prev_result.scalar() or 0

    # Get trending topics
    topics_result = await db.execute(
        select(TrendingTopic)
        .where(TrendingTopic.last_updated >= cutoff, TrendingTopic.client_id == client.id)
        .order_by(TrendingTopic.volume.desc())
        .limit(15)
    )
    topics_db = topics_result.scalars().all()

    # Share of voice
    positive_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(
            BrandMention.detected_at >= cutoff,
            BrandMention.sentiment == "positive",
            BrandMention.client_id == client.id,
        )
    )
    positive_count = positive_result.scalar() or 0
    share_of_voice = round(positive_count / max(total_mentions, 1) * 100)

    prev_positive_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(
            BrandMention.detected_at >= prev_cutoff,
            BrandMention.detected_at < cutoff,
            BrandMention.sentiment == "positive",
            BrandMention.client_id == client.id,
        )
    )
    prev_positive = prev_positive_result.scalar() or 0
    prev_share_of_voice = round(prev_positive / max(prev_mentions, 1) * 100)

    # Sentiment counts
    sentiment_result = await db.execute(
        select(BrandMention.sentiment, func.count(BrandMention.id))
        .where(BrandMention.detected_at >= cutoff, BrandMention.client_id == client.id)
        .group_by(BrandMention.sentiment)
    )
    sentiment_counts = {row[0]: row[1] for row in sentiment_result.all()}

    metrics = {
        "totalMentions": total_mentions,
        "prevMentions": prev_mentions,
        "shareOfVoice": share_of_voice,
        "prevShareOfVoice": prev_share_of_voice,
        "trendingCount": len(topics_db),
        "sentimentPositive": sentiment_counts.get("positive", 0),
        "sentimentNeutral": sentiment_counts.get("neutral", 0),
        "sentimentNegative": sentiment_counts.get("negative", 0),
    }

    # Recent mentions
    mentions_result = await db.execute(
        select(BrandMention)
        .where(BrandMention.client_id == client.id)
        .order_by(BrandMention.detected_at.desc())
        .limit(10)
    )
    mentions_db = mentions_result.scalars().all()

    recent_mentions = []
    for i, m in enumerate(mentions_db, 1):
        hours_ago = max(1, int((datetime.utcnow() - m.detected_at.replace(tzinfo=None)).total_seconds() / 3600))
        if hours_ago < 1:
            time_str = "upravo"
        elif hours_ago < 24:
            time_str = f"prije {hours_ago} sati"
        else:
            time_str = f"prije {hours_ago // 24} dana"

        recent_mentions.append({
            "id": i,
            "platform": m.platform,
            "author": m.author or f"@korisnik_{i}",
            "text": m.text[:200] if m.text else "",
            "sentiment": m.sentiment,
            "time": time_str,
            "reach": m.reach_estimate,
        })

    # Trending topics
    trending_topics = []
    for i, t in enumerate(topics_db, 1):
        growth = t.growth_rate or 0
        if growth > 30:
            velocity = "u porastu"
        elif growth > 10:
            velocity = "raste"
        else:
            velocity = "stabilno"

        trending_topics.append({
            "id": i,
            "topic": t.topic,
            "mentions": t.volume,
            "change": f"+{growth:.0f}%" if growth >= 0 else f"{growth:.0f}%",
            "velocity": velocity,
        })

    # Sentiment timeline (daily breakdown for last 14 days)
    timeline_cutoff = datetime.utcnow() - timedelta(days=14)
    timeline_result = await db.execute(
        select(
            func.date(BrandMention.detected_at).label("date"),
            BrandMention.sentiment,
            func.count(BrandMention.id).label("count"),
        )
        .where(BrandMention.detected_at >= timeline_cutoff, BrandMention.client_id == client.id)
        .group_by(func.date(BrandMention.detected_at), BrandMention.sentiment)
        .order_by(func.date(BrandMention.detected_at))
    )
    daily_sent: dict = {}
    for row in timeline_result.all():
        d = str(row.date)
        if d not in daily_sent:
            daily_sent[d] = {"date": d, "positive": 0, "neutral": 0, "negative": 0}
        daily_sent[d][row.sentiment] = row.count
    # Convert to percentages
    sentiment_timeline = []
    for day_data in daily_sent.values():
        day_total = day_data["positive"] + day_data["neutral"] + day_data["negative"]
        if day_total > 0:
            sentiment_timeline.append({
                "date": day_data["date"],
                "positive": round(day_data["positive"] / day_total * 100),
                "neutral": round(day_data["neutral"] / day_total * 100),
                "negative": round(day_data["negative"] / day_total * 100),
            })

    # Mention volume (daily count for 14 days)
    volume_result = await db.execute(
        select(
            func.date(BrandMention.detected_at).label("date"),
            func.count(BrandMention.id).label("count"),
        )
        .where(BrandMention.detected_at >= timeline_cutoff, BrandMention.client_id == client.id)
        .group_by(func.date(BrandMention.detected_at))
        .order_by(func.date(BrandMention.detected_at))
    )
    mention_volume = [{"date": str(row.date), "mentions": row.count} for row in volume_result.all()]

    # Competitor mentions (from Competitor model)
    competitor_mentions: list[dict] = []
    try:
        from app.models.competitor import Competitor
        comp_result = await db.execute(
            select(Competitor.name)
            .where(Competitor.client_id == client.id)
            .limit(4)
        )
        comp_colors = ["#EF4444", "#F59E0B", "#8B5CF6", "#22C55E"]
        for i, (comp_name,) in enumerate(comp_result.all()):
            # Count mentions where text contains competitor name
            comp_count_result = await db.execute(
                select(func.count(BrandMention.id))
                .where(
                    BrandMention.detected_at >= cutoff,
                    BrandMention.client_id == client.id,
                    BrandMention.text.ilike(f"%{comp_name}%"),
                )
            )
            comp_count = comp_count_result.scalar() or 0
            competitor_mentions.append({
                "name": comp_name,
                "mentions": comp_count,
                "color": comp_colors[i % len(comp_colors)],
            })
        # Add own brand
        competitor_mentions.insert(0, {
            "name": client.name or "Vi",
            "mentions": total_mentions,
            "color": "#0EA5E9",
        })
        competitor_mentions.sort(key=lambda x: -x["mentions"])
    except Exception:
        pass

    # Tracked keywords
    hashtags = client.hashtags if client.hashtags and isinstance(client.hashtags, list) else []

    return {
        "metrics": metrics,
        "recentMentions": recent_mentions,
        "trendingTopics": trending_topics,
        "sentimentTimeline": sentiment_timeline,
        "mentionVolume": mention_volume,
        "competitorMentions": competitor_mentions,
        "_meta": {
            "is_estimate": False,
            "tracked_keywords": [client.name or ""] + [f"#{h.replace('#','')}" for h in hashtags[:5]],
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


@router.get("/share-of-voice")
async def get_share_of_voice(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_share_of_voice(db)
    return result


@router.get("/crisis")
async def detect_crisis(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.detect_crisis(db)
    return result
