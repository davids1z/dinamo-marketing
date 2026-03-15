import logging
import random
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_client, get_claude_client
from app.services.academy_content import AcademyContentService
from app.models.academy import AcademyPlayer, AcademyMatch

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_service():
    return AcademyContentService(get_claude_client())


# ---------------------------------------------------------------------------
# Constants — Partner & Creator templates
# ---------------------------------------------------------------------------

PARTNER_TEMPLATES = [
    {
        "name": "Marko Influencer",
        "handle": "@marko_style",
        "category": "Lifestyle",
        "tier": "Premium",
        "platform": "instagram",
        "followers": 125000,
        "avg_engagement": 4.2,
        "specialties": ["fashion", "lifestyle", "travel"],
    },
    {
        "name": "Ana Foodie",
        "handle": "@ana_kuha",
        "category": "Hrana & piće",
        "tier": "Premium",
        "platform": "instagram",
        "followers": 89000,
        "avg_engagement": 5.8,
        "specialties": ["food", "cooking", "healthy"],
    },
    {
        "name": "TechBro Studio",
        "handle": "@techbro_hr",
        "category": "Tehnologija",
        "tier": "Kreator",
        "platform": "youtube",
        "followers": 210000,
        "avg_engagement": 3.1,
        "specialties": ["tech", "reviews", "gadgets"],
    },
    {
        "name": "Petra Fitness",
        "handle": "@petra_fit",
        "category": "Zdravlje & fitness",
        "tier": "Premium",
        "platform": "tiktok",
        "followers": 340000,
        "avg_engagement": 7.2,
        "specialties": ["fitness", "wellness", "nutrition"],
    },
    {
        "name": "Urban Collective",
        "handle": "@urban_col",
        "category": "Moda",
        "tier": "Standard",
        "platform": "instagram",
        "followers": 45000,
        "avg_engagement": 6.1,
        "specialties": ["fashion", "streetwear", "design"],
    },
    {
        "name": "Zeleni Život",
        "handle": "@zeleni_zivot",
        "category": "Ekologija",
        "tier": "Standard",
        "platform": "instagram",
        "followers": 32000,
        "avg_engagement": 8.4,
        "specialties": ["eco", "sustainability", "organic"],
    },
    {
        "name": "GameZone HR",
        "handle": "@gamezone_hr",
        "category": "Gaming",
        "tier": "Kreator",
        "platform": "youtube",
        "followers": 156000,
        "avg_engagement": 4.8,
        "specialties": ["gaming", "streaming", "esports"],
    },
    {
        "name": "Mama & Beba",
        "handle": "@mama_beba",
        "category": "Obitelj",
        "tier": "Standard",
        "platform": "instagram",
        "followers": 67000,
        "avg_engagement": 6.9,
        "specialties": ["parenting", "family", "kids"],
    },
    {
        "name": "Drone Vision",
        "handle": "@drone_vis",
        "category": "Fotografija",
        "tier": "Kreator",
        "platform": "youtube",
        "followers": 98000,
        "avg_engagement": 3.5,
        "specialties": ["photography", "drone", "travel"],
    },
    {
        "name": "Split Vibes",
        "handle": "@split_vibes",
        "category": "Putovanja",
        "tier": "Premium",
        "platform": "tiktok",
        "followers": 220000,
        "avg_engagement": 5.5,
        "specialties": ["travel", "croatia", "tourism"],
    },
    {
        "name": "Beauty Box HR",
        "handle": "@beautybox_hr",
        "category": "Ljepota",
        "tier": "Standard",
        "platform": "instagram",
        "followers": 54000,
        "avg_engagement": 7.1,
        "specialties": ["beauty", "skincare", "makeup"],
    },
    {
        "name": "Auto Guru",
        "handle": "@auto_guru_hr",
        "category": "Automobili",
        "tier": "Kreator",
        "platform": "youtube",
        "followers": 180000,
        "avg_engagement": 2.9,
        "specialties": ["cars", "automotive", "reviews"],
    },
]

CONTENT_STATUS_OPTIONS = ["Odobreno", "U čekanju", "U produkciji", "Snimanje", "Pregled"]

TIER_LABELS = {
    "Premium": {"cost_range": (500, 2000), "label": "Premium"},
    "Standard": {"cost_range": (150, 500), "label": "Standard"},
    "Kreator": {"cost_range": (200, 800), "label": "Kreator"},
}

AI_ADVICE_POOL = [
    "Partner \"{name}\" ima engagement od {engagement}% — {quality} prosjeka kategorije ({cat_avg}%). {action}",
    "Affiliate link {handle} generirao je {conversions} konverzija ovaj mjesec uz ROAS od {roas}x.",
    "Sadržaj od \"{name}\" ima {reach_label} doseg ({reach}) — {action}",
    "AI predlaže pojačanje suradnje s \"{name}\" zbog visokog Match Score-a ({match}%).",
    "ROI partnera \"{name}\": uloženo {cost}€, generirano {revenue}€ prihoda ({roi_pct}% povrat).",
]


# ---------------------------------------------------------------------------
# Match scoring — AI kompatibilnost
# ---------------------------------------------------------------------------

def _compute_match_score(
    client_desc: str,
    client_audience: str,
    partner_specialties: list[str],
    partner_category: str,
    rng: random.Random,
) -> int:
    """Compute AI compatibility score between client and partner."""
    score = 50  # base

    desc_lower = (client_desc or "").lower()
    audience_lower = (client_audience or "").lower()
    combined = f"{desc_lower} {audience_lower}"

    # Category keyword matching
    category_keywords = {
        "Hrana & piće": ["hrana", "food", "restoran", "kuhanje", "jelo", "piće", "drink"],
        "Zdravlje & fitness": ["zdravlje", "fitness", "sport", "trening", "wellness", "gym"],
        "Tehnologija": ["tech", "tehnologija", "softver", "app", "digital", "saas"],
        "Moda": ["moda", "fashion", "odjeća", "stil", "style", "dizajn"],
        "Lifestyle": ["lifestyle", "život", "stil", "trend"],
        "Ekologija": ["eco", "ekologija", "zeleno", "održiv", "organic"],
        "Putovanja": ["putovanje", "travel", "turizam", "hotel", "destinacija"],
        "Ljepota": ["ljepota", "beauty", "kozmetika", "skincare"],
        "Obitelj": ["obitelj", "djeca", "family", "mama", "roditelj"],
        "Gaming": ["gaming", "igre", "esport", "stream"],
        "Fotografija": ["foto", "photo", "video", "drone", "snimanje"],
        "Automobili": ["auto", "car", "vozilo", "motor"],
    }

    keywords = category_keywords.get(partner_category, [])
    matches = sum(1 for kw in keywords if kw in combined)
    score += min(matches * 8, 30)

    # Specialty overlap
    for spec in partner_specialties:
        if spec.lower() in combined:
            score += 5

    # Random variance
    score += rng.randint(-5, 10)

    return max(15, min(98, score))


# ---------------------------------------------------------------------------
# Estimate data generator
# ---------------------------------------------------------------------------

def _generate_estimate_data(client_id, client_name: str, connected_platforms: list[str],
                            client_desc: str = "", client_audience: str = "") -> dict:
    """Generate realistic partner & creator data when no DB records exist."""
    rng = random.Random(f"partners-{client_id}")

    num_platforms = max(len(connected_platforms), 1)
    today = date.today()

    # Pick 8-10 partners
    num_partners = min(rng.randint(8, 10), len(PARTNER_TEMPLATES))
    selected = rng.sample(PARTNER_TEMPLATES, num_partners)

    partners = []
    total_revenue = 0.0
    total_cost = 0.0
    active_collabs = 0
    content_items = []

    for idx, tmpl in enumerate(selected):
        # Match score
        match_score = _compute_match_score(
            client_desc, client_audience,
            tmpl["specialties"], tmpl["category"], rng,
        )

        # Performance metrics
        followers = int(tmpl["followers"] * rng.uniform(0.8, 1.2))
        engagement = round(tmpl["avg_engagement"] * rng.uniform(0.7, 1.4), 1)
        campaigns_done = rng.randint(1, 12)
        reach = int(followers * engagement / 100 * campaigns_done * rng.uniform(0.5, 1.5))
        clicks = int(reach * rng.uniform(0.02, 0.08))
        conversions = int(clicks * rng.uniform(0.03, 0.12))

        cost_range = TIER_LABELS[tmpl["tier"]]["cost_range"]
        cost_per_post = rng.uniform(*cost_range)
        total_partner_cost = cost_per_post * campaigns_done
        revenue_per_conversion = rng.uniform(15, 80)
        partner_revenue = conversions * revenue_per_conversion
        roi = round(((partner_revenue - total_partner_cost) / max(total_partner_cost, 1)) * 100, 1)
        roas = round(partner_revenue / max(total_partner_cost, 1), 1)

        # Status
        is_active = rng.random() > 0.3
        content_status = rng.choice(CONTENT_STATUS_OPTIONS)
        if is_active:
            active_collabs += 1

        # Affiliate link
        affiliate_code = f"{client_name[:4].upper()}{tmpl['handle'].replace('@', '').upper()[:6]}"

        # Last activity
        days_ago = rng.randint(1, 30)
        last_activity = (today - timedelta(days=days_ago)).isoformat()

        partner = {
            "id": f"p_{idx}_{client_id}",
            "name": tmpl["name"],
            "handle": tmpl["handle"],
            "avatar_url": None,
            "category": tmpl["category"],
            "tier": tmpl["tier"],
            "platform": tmpl["platform"],
            "followers": followers,
            "engagement_rate": engagement,
            "match_score": match_score,
            "campaigns_done": campaigns_done,
            "reach": reach,
            "clicks": clicks,
            "conversions": conversions,
            "cost_per_post": round(cost_per_post, 2),
            "total_cost": round(total_partner_cost, 2),
            "revenue_generated": round(partner_revenue, 2),
            "roi": roi,
            "roas": roas,
            "affiliate_code": affiliate_code,
            "content_status": content_status,
            "is_active": is_active,
            "last_activity": last_activity,
            "specialties": tmpl["specialties"],
        }
        partners.append(partner)

        total_revenue += partner_revenue
        total_cost += total_partner_cost

        # Generate content pipeline items (1-2 per active partner)
        if is_active and len(content_items) < 8:
            content_types = ["Video", "Reels", "Story", "Karusel", "Unboxing", "Tutorial", "Review"]
            platforms = ["Instagram", "TikTok", "YouTube", "Instagram + TikTok"]
            due_date = today + timedelta(days=rng.randint(1, 21))
            content_items.append({
                "id": f"c_{len(content_items)}",
                "partner_name": tmpl["name"],
                "partner_handle": tmpl["handle"],
                "title": f"{rng.choice(content_types)}: {tmpl['name']} x {client_name}",
                "type": rng.choice(content_types),
                "platform": rng.choice(platforms),
                "status": content_status,
                "due": due_date.strftime("%b %d"),
                "due_date": due_date.isoformat(),
            })

    # Sort by match_score descending
    partners.sort(key=lambda x: x["match_score"], reverse=True)

    # AI advice
    best_partner = max(partners, key=lambda p: p["roas"])
    worst_partner = min(partners, key=lambda p: p["roas"])
    highest_match = partners[0] if partners else None
    total_roi = round(((total_revenue - total_cost) / max(total_cost, 1)) * 100, 1)

    ai_advice = {
        "title": "AI Matchmaking — Preporuke",
        "insights": [],
    }

    if highest_match:
        ai_advice["insights"].append({
            "icon": "Target",
            "text": f"\"{highest_match['name']}\" ima najviši Match Score ({highest_match['match_score']}%) "
                    f"za {client_name}. Kategorija '{highest_match['category']}' idealno odgovara vašem brendu.",
            "type": "success",
        })

    ai_advice["insights"].append({
        "icon": "TrendingUp",
        "text": f"Partner \"{best_partner['name']}\" donosi najbolji ROAS ({best_partner['roas']}x). "
                f"Svaki uloženi euro u suradnju generira {best_partner['roas']}€ prihoda.",
        "type": "success",
    })

    if worst_partner["roas"] < 1.5:
        ai_advice["insights"].append({
            "icon": "AlertTriangle",
            "text": f"Partner \"{worst_partner['name']}\" ima nizak ROI ({worst_partner['roi']}%). "
                    f"Razmotrite smanjenje suradnje ili promjenu formata sadržaja.",
            "type": "warning",
        })

    ai_advice["insights"].append({
        "icon": "DollarSign",
        "text": f"Ukupni ROI partnerskog programa: {total_roi}%. "
                f"Uloženo {total_cost:.0f}€, generirano {total_revenue:.0f}€ prihoda.",
        "type": "info",
    })

    pending_content = sum(1 for c in content_items if c["status"] == "U čekanju")
    if pending_content > 0:
        ai_advice["insights"].append({
            "icon": "Clock",
            "text": f"{pending_content} sadržaj(a) čeka(ju) na odobrenje. "
                    f"Brzo odobravanje održava partnere motiviranima.",
            "type": "warning",
        })

    # Tier distribution
    tier_distribution = {}
    for p in partners:
        tier_distribution.setdefault(p["tier"], {"count": 0, "spend": 0, "revenue": 0})
        tier_distribution[p["tier"]]["count"] += 1
        tier_distribution[p["tier"]]["spend"] += p["total_cost"]
        tier_distribution[p["tier"]]["revenue"] += p["revenue_generated"]

    tier_comparison = []
    for tier, data in tier_distribution.items():
        tier_comparison.append({
            "tier": tier,
            "count": data["count"],
            "total_spend": round(data["spend"], 2),
            "total_revenue": round(data["revenue"], 2),
            "avg_roas": round(data["revenue"] / max(data["spend"], 1), 1),
        })

    # Discover suggestions (2-3 new partners AI found)
    discovery_pool = [t for t in PARTNER_TEMPLATES if t not in selected]
    discoveries = []
    for d_tmpl in rng.sample(discovery_pool, min(len(discovery_pool), 3)):
        m_score = _compute_match_score(client_desc, client_audience, d_tmpl["specialties"], d_tmpl["category"], rng)
        discoveries.append({
            "name": d_tmpl["name"],
            "handle": d_tmpl["handle"],
            "category": d_tmpl["category"],
            "platform": d_tmpl["platform"],
            "followers": d_tmpl["followers"],
            "engagement_rate": d_tmpl["avg_engagement"],
            "match_score": m_score,
            "reason": f"AI predlaže na temelju sličnosti s vašom publikom i brendom {client_name}.",
        })
    discoveries.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "partners": partners,
        "contentPipeline": content_items,
        "discoveries": discoveries,
        "summary": {
            "active_collaborations": active_collabs,
            "total_partners": len(partners),
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_roi": total_roi,
            "avg_match_score": round(sum(p["match_score"] for p in partners) / max(len(partners), 1)),
            "total_reach": sum(p["reach"] for p in partners),
            "total_conversions": sum(p["conversions"] for p in partners),
            "pending_content": pending_content,
            "active_programs": max(2, active_collabs // 3),
        },
        "tier_comparison": tier_comparison,
        "ai_advice": ai_advice,
        "_meta": {
            "is_estimate": True,
            "connected_platforms": connected_platforms,
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# BFF endpoint — all partner page data in one call
# ---------------------------------------------------------------------------

@router.get("/page-data")
async def get_page_data(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Return all partners page data. Falls back to estimate data if no real records."""
    user, client, role = ctx

    # Check for real academy players (used as partner proxies)
    query = select(func.count()).select_from(AcademyPlayer).where(AcademyPlayer.client_id == client.id)
    res = await db.execute(query)
    count = res.scalar() or 0

    if count > 0:
        # Real data path — delegate to legacy endpoint logic
        service = _get_service()
        stats = await service.get_academy_stats(db)
        result = await db.execute(
            select(AcademyPlayer).where(AcademyPlayer.client_id == client.id).order_by(AcademyPlayer.name)
        )
        players_db = result.scalars().all()

        partners = []
        for i, p in enumerate(players_db, 1):
            player_stats = p.stats or {}
            partners.append({
                "id": str(p.id),
                "name": p.name,
                "handle": "",
                "avatar_url": None,
                "category": p.position or "General",
                "tier": "Premium" if p.is_featured else "Standard",
                "platform": "instagram",
                "followers": 0,
                "engagement_rate": 0,
                "match_score": 50,
                "campaigns_done": player_stats.get("appearances", 0),
                "reach": player_stats.get("social_mentions", 0) * 10,
                "clicks": 0,
                "conversions": player_stats.get("goals", 0),
                "cost_per_post": 0,
                "total_cost": 0,
                "revenue_generated": 0,
                "roi": 0,
                "roas": 0,
                "affiliate_code": "",
                "content_status": "Odobreno" if p.is_featured else "U čekanju",
                "is_active": True,
                "last_activity": None,
                "specialties": [],
            })

        return {
            "partners": partners,
            "contentPipeline": [],
            "discoveries": [],
            "summary": {
                "active_collaborations": len(partners),
                "total_partners": len(partners),
                "total_revenue": 0,
                "total_cost": 0,
                "total_roi": 0,
                "avg_match_score": 50,
                "total_reach": sum(p["reach"] for p in partners),
                "total_conversions": sum(p["conversions"] for p in partners),
                "pending_content": 0,
                "active_programs": 0,
            },
            "tier_comparison": [],
            "ai_advice": {"title": "AI Matchmaking", "insights": []},
            "_meta": {
                "is_estimate": False,
                "connected_platforms": [],
                "analyzed_at": datetime.utcnow().isoformat(),
            },
        }

    # No real data — generate estimates
    connected = []
    if client.social_handles and isinstance(client.social_handles, dict):
        connected = [k for k, v in client.social_handles.items() if v]

    if not connected:
        return {
            "partners": [],
            "contentPipeline": [],
            "discoveries": [],
            "summary": {
                "active_collaborations": 0,
                "total_partners": 0,
                "total_revenue": 0,
                "total_cost": 0,
                "total_roi": 0,
                "avg_match_score": 0,
                "total_reach": 0,
                "total_conversions": 0,
                "pending_content": 0,
                "active_programs": 0,
            },
            "tier_comparison": [],
            "ai_advice": {"title": "AI Matchmaking", "insights": []},
            "_meta": {
                "is_estimate": False,
                "connected_platforms": [],
                "analyzed_at": datetime.utcnow().isoformat(),
            },
        }

    return _generate_estimate_data(
        str(client.id),
        client.name or "Brend",
        connected,
        client_desc=client.business_description or "",
        client_audience=client.target_audience or "",
    )


# ---------------------------------------------------------------------------
# Legacy endpoints (preserved)
# ---------------------------------------------------------------------------

@router.get("/players")
async def get_players(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns {metrics, players, contentPipeline} for the Academy page."""
    user, client, role = ctx
    service = _get_service()

    stats = await service.get_academy_stats(db)

    result = await db.execute(
        select(AcademyPlayer).where(AcademyPlayer.client_id == client.id).order_by(AcademyPlayer.name)
    )
    players_db = result.scalars().all()

    players = []
    for i, p in enumerate(players_db, 1):
        player_stats = p.stats or {}
        team_level = p.team_level or ""
        age_group = team_level if team_level.startswith("U") else "U21"
        if team_level == "first_team":
            age_group = "U21"

        players.append({
            "id": i,
            "name": p.name,
            "position": p.position or "CM",
            "ageGroup": age_group,
            "appearances": player_stats.get("appearances", 0),
            "goals": player_stats.get("goals", 0),
            "assists": player_stats.get("assists", 0),
            "featured": p.is_featured,
            "socialMentions": player_stats.get("social_mentions", 0),
        })

    active_camps = stats.get("active_camps", {})
    active_camps_count = len(active_camps) if isinstance(active_camps, dict) else (active_camps if isinstance(active_camps, int) else 0)

    metrics = {
        "promotedPlayers": stats.get("players_promoted", 0),
        "prevPromotedPlayers": max(stats.get("players_promoted", 0) - 3, 0),
        "transferRevenue": stats.get("transfer_revenue", 0),
        "prevTransferRevenue": max(int(stats.get("transfer_revenue", 0) * 0.7), 0),
        "activeCamps": active_camps_count,
    }

    content_pipeline = [
        {"id": 1, "title": "U19 finale highlights reel", "type": "Video", "platform": "Instagram + TikTok", "status": "U produkciji", "due": "Mar 7"},
        {"id": 2, "title": "Od akademije do prvog tima", "type": "Dokumentarac", "platform": "YouTube", "status": "Pregled scenarija", "due": "Mar 12"},
        {"id": 3, "title": "Promocija upisa na kamp akademije", "type": "Karusel", "platform": "Instagram + Facebook", "status": "Spremno", "due": "Mar 6"},
        {"id": 4, "title": "Omladinski kup iza kulisa", "type": "Serija prica", "platform": "Instagram", "status": "Snimanje", "due": "Mar 9"},
        {"id": 5, "title": "Mjesecni bilten akademije", "type": "Email + Web", "platform": "Web stranica", "status": "Nacrt", "due": "Mar 15"},
    ]

    return {
        "metrics": metrics,
        "players": players,
        "contentPipeline": content_pipeline,
    }


@router.get("/players/{player_id}")
async def get_player_detail(
    player_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_player_detail(db, player_id)
    return result


@router.post("/match-report/{match_id}")
async def generate_match_report(
    match_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.generate_match_report(db, match_id)
    return result


@router.get("/stats")
async def get_academy_stats(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_academy_stats(db)
    return result


@router.get("/matches")
async def list_matches(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    query = select(AcademyMatch).where(AcademyMatch.client_id == client.id).order_by(AcademyMatch.created_at.desc())
    res = await db.execute(query)
    matches = res.scalars().all()
    return matches
