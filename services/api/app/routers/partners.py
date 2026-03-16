"""Partners & Creators router — CRUD + KPI summary + AI match scoring."""

import random
import uuid as uuid_mod
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client
from app.models.partner import Partner

router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class PartnerCreate(PydanticBase):
    name: str
    handle: str = ""
    platform: str = "instagram"
    website: str = ""
    category: str = ""
    partner_type: str = "influencer"
    status: str = "prospect"
    followers: int = 0
    engagement_rate: float = 0.0
    avg_reach_per_post: int = 0
    audience_overlap_pct: float = 0.0
    notes: str = ""


class PartnerUpdate(PydanticBase):
    name: Optional[str] = None
    handle: Optional[str] = None
    platform: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None
    partner_type: Optional[str] = None
    status: Optional[str] = None
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    avg_reach_per_post: Optional[int] = None
    audience_overlap_pct: Optional[float] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Match score computation (pure heuristic — no AI call)
# ---------------------------------------------------------------------------

def compute_match_score(partner: "Partner", client) -> int:
    """
    Heuristic brand-fit score 0–100.
    - base: 40
    - category matches client industry keyword: +20
    - engagement_rate >= 3%: +15
    - engagement_rate >= 1.5%: +8 (partial)
    - audience_overlap_pct contribution: up to +15
    - follower count reasonableness: up to +10
    """
    score = 40

    # Category / industry alignment
    client_desc = (
        (client.business_description or "") + " " + (client.target_audience or "")
    ).lower()
    partner_cat = partner.category.lower()
    partner_type = partner.partner_type.lower()

    # keyword overlap between partner category and client description
    cat_keywords = [w for w in partner_cat.replace(",", " ").split() if len(w) > 3]
    if any(kw in client_desc for kw in cat_keywords):
        score += 20
    elif partner_type in ("brand", "media"):
        score += 10

    # Engagement rate quality
    er = partner.engagement_rate
    if er >= 5.0:
        score += 15
    elif er >= 3.0:
        score += 12
    elif er >= 1.5:
        score += 8
    elif er >= 0.5:
        score += 4

    # Audience overlap
    overlap = partner.audience_overlap_pct
    if overlap >= 40:
        score += 15
    elif overlap >= 20:
        score += 10
    elif overlap >= 5:
        score += 5

    # Follower count fit — prefer mid-tier (10K–500K) over mega-celebrities
    f = partner.followers
    if 10_000 <= f <= 500_000:
        score += 10
    elif 1_000 <= f < 10_000:
        score += 6
    elif 500_000 < f <= 2_000_000:
        score += 4
    # > 2M: no bonus (likely out of reach / misaligned)

    return min(100, max(0, score))


# ---------------------------------------------------------------------------
# Seed helpers — create realistic demo partners for a client
# ---------------------------------------------------------------------------

DEMO_PARTNERS = [
    {
        "name": "Ana Kovač Lifestyle",
        "handle": "@anakovac",
        "platform": "instagram",
        "category": "lifestyle, wellness",
        "partner_type": "influencer",
        "status": "active",
        "followers": 87_400,
        "engagement_rate": 4.2,
        "avg_reach_per_post": 38_000,
        "audience_overlap_pct": 62.0,
        "campaign_count": 3,
        "total_posts_delivered": 12,
        "total_reach_delivered": 456_000,
    },
    {
        "name": "SportActive Media",
        "handle": "@sportactivemedia",
        "platform": "instagram",
        "category": "sports, fitness, health",
        "partner_type": "media",
        "status": "active",
        "followers": 234_000,
        "engagement_rate": 2.8,
        "avg_reach_per_post": 95_000,
        "audience_overlap_pct": 48.0,
        "campaign_count": 2,
        "total_posts_delivered": 8,
        "total_reach_delivered": 760_000,
    },
    {
        "name": "Matija Blažević",
        "handle": "@matijabk",
        "platform": "tiktok",
        "category": "tech, lifestyle, youth",
        "partner_type": "influencer",
        "status": "active",
        "followers": 312_000,
        "engagement_rate": 6.1,
        "avg_reach_per_post": 180_000,
        "audience_overlap_pct": 35.0,
        "campaign_count": 1,
        "total_posts_delivered": 4,
        "total_reach_delivered": 720_000,
    },
    {
        "name": "Urbani Momenti",
        "handle": "@urbanmomenti",
        "platform": "instagram",
        "category": "urban, culture, entertainment",
        "partner_type": "influencer",
        "status": "paused",
        "followers": 52_300,
        "engagement_rate": 3.7,
        "avg_reach_per_post": 21_000,
        "audience_overlap_pct": 29.0,
        "campaign_count": 2,
        "total_posts_delivered": 6,
        "total_reach_delivered": 126_000,
    },
    {
        "name": "Kreativna Zajednica",
        "handle": "@kreativnazajednica",
        "platform": "multi",
        "category": "creativity, design, branding",
        "partner_type": "agency",
        "status": "prospect",
        "followers": 18_900,
        "engagement_rate": 5.5,
        "avg_reach_per_post": 9_500,
        "audience_overlap_pct": 22.0,
        "campaign_count": 0,
        "total_posts_delivered": 0,
        "total_reach_delivered": 0,
    },
    {
        "name": "EcoStyle Brand",
        "handle": "@ecostylebrand",
        "platform": "instagram",
        "category": "sustainability, eco, lifestyle",
        "partner_type": "brand",
        "status": "active",
        "followers": 145_000,
        "engagement_rate": 2.1,
        "avg_reach_per_post": 55_000,
        "audience_overlap_pct": 41.0,
        "campaign_count": 4,
        "total_posts_delivered": 16,
        "total_reach_delivered": 880_000,
    },
    {
        "name": "Dario Perić Fitness",
        "handle": "@dariopericfit",
        "platform": "youtube",
        "category": "fitness, health, motivation",
        "partner_type": "influencer",
        "status": "prospect",
        "followers": 67_200,
        "engagement_rate": 3.9,
        "avg_reach_per_post": 28_000,
        "audience_overlap_pct": 55.0,
        "campaign_count": 0,
        "total_posts_delivered": 0,
        "total_reach_delivered": 0,
    },
    {
        "name": "City Food Guide",
        "handle": "@cityfoodguide",
        "platform": "instagram",
        "category": "food, lifestyle, hospitality",
        "partner_type": "influencer",
        "status": "ended",
        "followers": 43_800,
        "engagement_rate": 1.8,
        "avg_reach_per_post": 14_000,
        "audience_overlap_pct": 18.0,
        "campaign_count": 1,
        "total_posts_delivered": 3,
        "total_reach_delivered": 42_000,
    },
]


def _seed_partners(client, db_sync) -> int:
    """Insert demo partners for a client (sync, for Celery tasks)."""
    today = date.today()
    created = 0
    for p in DEMO_PARTNERS:
        partner = Partner(
            id=uuid_mod.uuid4(),
            client_id=client.id,
            name=p["name"],
            handle=p.get("handle", ""),
            platform=p.get("platform", "instagram"),
            category=p.get("category", ""),
            partner_type=p.get("partner_type", "influencer"),
            status=p.get("status", "prospect"),
            followers=p.get("followers", 0),
            engagement_rate=p.get("engagement_rate", 0.0),
            avg_reach_per_post=p.get("avg_reach_per_post", 0),
            audience_overlap_pct=p.get("audience_overlap_pct", 0.0),
            campaign_count=p.get("campaign_count", 0),
            total_posts_delivered=p.get("total_posts_delivered", 0),
            total_reach_delivered=p.get("total_reach_delivered", 0),
            partnership_start=(
                today - timedelta(days=random.randint(60, 365))
                if p.get("status") in ("active", "paused", "ended")
                else None
            ),
            partnership_end=(
                today - timedelta(days=random.randint(1, 30))
                if p.get("status") == "ended"
                else None
            ),
            match_score=50,  # placeholder; computed on read
        )
        db_sync.add(partner)
        created += 1
    db_sync.commit()
    return created


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/")
async def get_partners(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns {partners, summary} for the Partners page."""
    user, client, role = ctx

    result = await db.execute(
        select(Partner).where(Partner.client_id == client.id).order_by(Partner.name)
    )
    partners = result.scalars().all()

    # Auto-seed demo partners if none exist
    if not partners:
        from app.database import SyncSessionLocal
        with SyncSessionLocal() as sync_db:
            sync_client_result = sync_db.execute(
                select(Partner).where(Partner.client_id == client.id).limit(1)
            )
            if not sync_client_result.scalar_one_or_none():
                # Import client model for sync session
                from app.models.client import Client
                sync_client = sync_db.get(Client, client.id)
                if sync_client:
                    _seed_partners(sync_client, sync_db)

        # Re-query after seeding
        db.expire_all()
        result2 = await db.execute(
            select(Partner).where(Partner.client_id == client.id).order_by(Partner.name)
        )
        partners = result2.scalars().all()

    # Recompute match scores
    partner_list = []
    for p in partners:
        score = compute_match_score(p, client)
        partner_list.append({
            "id": str(p.id),
            "name": p.name,
            "handle": p.handle,
            "platform": p.platform,
            "website": p.website,
            "category": p.category,
            "partner_type": p.partner_type,
            "status": p.status,
            "followers": p.followers,
            "engagement_rate": round(p.engagement_rate, 1),
            "avg_reach_per_post": p.avg_reach_per_post,
            "audience_overlap_pct": round(p.audience_overlap_pct, 1),
            "match_score": score,
            "campaign_count": p.campaign_count,
            "total_posts_delivered": p.total_posts_delivered,
            "total_reach_delivered": p.total_reach_delivered,
            "avg_cpe": round(p.avg_cpe, 2),
            "partnership_start": p.partnership_start.isoformat() if p.partnership_start else None,
            "partnership_end": p.partnership_end.isoformat() if p.partnership_end else None,
            "notes": p.notes,
        })

    # KPI summary
    total = len(partner_list)
    active = sum(1 for p in partner_list if p["status"] == "active")
    total_reach = sum(p["total_reach_delivered"] for p in partner_list)
    avg_engagement = (
        round(sum(p["engagement_rate"] for p in partner_list) / total, 1) if total else 0.0
    )
    avg_match = round(sum(p["match_score"] for p in partner_list) / total) if total else 0

    return {
        "partners": partner_list,
        "summary": {
            "total": total,
            "active": active,
            "total_reach_delivered": total_reach,
            "avg_engagement_rate": avg_engagement,
            "avg_match_score": avg_match,
        },
    }


@router.post("/")
async def create_partner(
    body: PartnerCreate,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Create a new partner record."""
    user, client, role = ctx

    partner = Partner(
        id=uuid_mod.uuid4(),
        client_id=client.id,
        **body.model_dump(),
        match_score=50,
    )
    # Compute score immediately
    partner.match_score = compute_match_score(partner, client)
    db.add(partner)
    await db.flush()

    return {
        "id": str(partner.id),
        "name": partner.name,
        "match_score": partner.match_score,
    }


@router.patch("/{partner_id}")
async def update_partner(
    partner_id: uuid_mod.UUID,
    body: PartnerUpdate,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Update partner fields."""
    user, client, role = ctx

    partner = await db.get(Partner, partner_id)
    if not partner or partner.client_id != client.id:
        raise HTTPException(status_code=404, detail="Partner nije pronađen")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(partner, field, value)

    partner.match_score = compute_match_score(partner, client)
    await db.flush()
    return {"id": str(partner.id), "match_score": partner.match_score}


@router.delete("/{partner_id}")
async def delete_partner(
    partner_id: uuid_mod.UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Delete a partner record."""
    user, client, role = ctx

    partner = await db.get(Partner, partner_id)
    if not partner or partner.client_id != client.id:
        raise HTTPException(status_code=404, detail="Partner nije pronađen")

    name = partner.name
    await db.delete(partner)
    return {"deleted": True, "id": str(partner_id), "name": name}
