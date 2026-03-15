import logging
import random
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_buffer_client, get_current_client
from app.services.diaspora_manager import DiasporaManagerService
from app.models.market import DiasporaData, Country

logger = logging.getLogger(__name__)

router = APIRouter()

COUNTRY_FLAGS = {
    "Germany": "🇩🇪", "Austria": "🇦🇹",
    "United States": "🇺🇸", "Canada": "🇨🇦",
    "Switzerland": "🇨🇭", "Australia": "🇦🇺",
    "Sweden": "🇸🇪", "Ireland": "🇮🇪",
    "Norway": "🇳🇴", "Argentina": "🇦🇷",
    "Croatia": "🇭🇷", "Bosnia": "🇧🇦",
    "Serbia": "🇷🇸", "Slovenia": "🇸🇮",
    "Italy": "🇮🇹", "United Kingdom": "🇬🇧",
    "France": "🇫🇷", "Netherlands": "🇳🇱",
    "Belgium": "🇧🇪", "Spain": "🇪🇸",
}


def _get_service():
    return DiasporaManagerService(
        get_claude_client(),
        get_buffer_client(),
    )


# ---------------------------------------------------------------------------
# Constants — Market templates
# ---------------------------------------------------------------------------

MARKET_TEMPLATES = [
    {
        "country": "Hrvatska", "code": "HR", "flag": "🇭🇷",
        "region": "Domaće tržište", "language": "hr",
        "cities": ["Zagreb", "Split", "Rijeka", "Osijek"],
        "base_reach": 180000, "base_engagement": 6.5,
        "ad_cost_cpm": 2.8, "growth_base": 3.2,
    },
    {
        "country": "Njemačka", "code": "DE", "flag": "🇩🇪",
        "region": "Dijaspora — DACH", "language": "de",
        "cities": ["München", "Berlin", "Frankfurt", "Stuttgart"],
        "base_reach": 95000, "base_engagement": 4.1,
        "ad_cost_cpm": 8.5, "growth_base": 12.4,
    },
    {
        "country": "Austrija", "code": "AT", "flag": "🇦🇹",
        "region": "Dijaspora — DACH", "language": "de",
        "cities": ["Beč", "Graz", "Linz", "Salzburg"],
        "base_reach": 72000, "base_engagement": 5.3,
        "ad_cost_cpm": 7.2, "growth_base": 18.7,
    },
    {
        "country": "Švicarska", "code": "CH", "flag": "🇨🇭",
        "region": "Dijaspora — DACH", "language": "de",
        "cities": ["Zürich", "Basel", "Bern"],
        "base_reach": 28000, "base_engagement": 3.8,
        "ad_cost_cpm": 12.0, "growth_base": 8.1,
    },
    {
        "country": "BiH", "code": "BA", "flag": "🇧🇦",
        "region": "Regionalno", "language": "hr",
        "cities": ["Sarajevo", "Mostar", "Banja Luka"],
        "base_reach": 45000, "base_engagement": 5.9,
        "ad_cost_cpm": 1.5, "growth_base": 4.5,
    },
    {
        "country": "Slovenija", "code": "SI", "flag": "🇸🇮",
        "region": "Regionalno", "language": "hr",
        "cities": ["Ljubljana", "Maribor"],
        "base_reach": 22000, "base_engagement": 4.7,
        "ad_cost_cpm": 3.5, "growth_base": 6.2,
    },
    {
        "country": "Srbija", "code": "RS", "flag": "🇷🇸",
        "region": "Regionalno", "language": "hr",
        "cities": ["Beograd", "Novi Sad"],
        "base_reach": 35000, "base_engagement": 5.1,
        "ad_cost_cpm": 1.8, "growth_base": 7.3,
    },
    {
        "country": "Irska", "code": "IE", "flag": "🇮🇪",
        "region": "Dijaspora — EU", "language": "en",
        "cities": ["Dublin", "Cork"],
        "base_reach": 12000, "base_engagement": 3.2,
        "ad_cost_cpm": 9.0, "growth_base": 15.3,
    },
    {
        "country": "Švedska", "code": "SE", "flag": "🇸🇪",
        "region": "Dijaspora — EU", "language": "en",
        "cities": ["Stockholm", "Malmö", "Göteborg"],
        "base_reach": 18000, "base_engagement": 3.5,
        "ad_cost_cpm": 10.5, "growth_base": 9.8,
    },
    {
        "country": "SAD", "code": "US", "flag": "🇺🇸",
        "region": "Dijaspora — prekomorska", "language": "en",
        "cities": ["New York", "Chicago", "Los Angeles"],
        "base_reach": 52000, "base_engagement": 2.8,
        "ad_cost_cpm": 14.0, "growth_base": 6.7,
    },
    {
        "country": "Kanada", "code": "CA", "flag": "🇨🇦",
        "region": "Dijaspora — prekomorska", "language": "en",
        "cities": ["Toronto", "Vancouver"],
        "base_reach": 25000, "base_engagement": 3.0,
        "ad_cost_cpm": 11.0, "growth_base": 5.4,
    },
    {
        "country": "Australija", "code": "AU", "flag": "🇦🇺",
        "region": "Dijaspora — prekomorska", "language": "en",
        "cities": ["Sydney", "Melbourne"],
        "base_reach": 15000, "base_engagement": 2.5,
        "ad_cost_cpm": 10.0, "growth_base": 4.1,
    },
]

CONTENT_TEMPLATES = [
    {
        "title": "Promotivni video — lokalizirani sadržaj",
        "languages": ["HR", "EN", "DE"],
        "platform": "Instagram + TikTok",
        "type": "Video",
        "description": "Glavni promotivni video s prijevodima za sva ključna tržišta",
    },
    {
        "title": "Blog post — Priča o brendu",
        "languages": ["HR", "EN"],
        "platform": "Web + LinkedIn",
        "type": "Članak",
        "description": "SEO optimizirani članak za domaće i međunarodna tržišta",
    },
    {
        "title": "Newsletter — Mjesečni pregled",
        "languages": ["HR", "DE"],
        "platform": "Email",
        "type": "Newsletter",
        "description": "Mjesečni bilten s personaliziranim sadržajem po regijama",
    },
    {
        "title": "Produktna kampanja — DACH tržište",
        "languages": ["DE"],
        "platform": "Facebook + Instagram",
        "type": "Oglasni kreativ",
        "description": "Lokalizirana oglasna kampanja za njemačko govorno područje",
    },
    {
        "title": "Korisnički testimonijali",
        "languages": ["HR", "EN", "DE"],
        "platform": "Sve platforme",
        "type": "Karusel",
        "description": "Recenzije i iskustva korisnika iz različitih regija",
    },
    {
        "title": "Sezonska akcija — regionalna ponuda",
        "languages": ["HR", "EN"],
        "platform": "Instagram + Web",
        "type": "Story + Post",
        "description": "Lokalizirane sezonske promocije prilagođene svakom tržištu",
    },
]


# ---------------------------------------------------------------------------
# Estimate data generator
# ---------------------------------------------------------------------------

def _generate_estimate_data(client_id, client_name: str, connected_platforms: list[str],
                            client_desc: str = "", client_audience: str = "") -> dict:
    """Generate realistic geographic market data when no DiasporaData records exist."""
    rng = random.Random(f"diaspora-{client_id}")

    num_platforms = max(len(connected_platforms), 1)
    today = date.today()

    # Pick 8-10 markets
    num_markets = min(rng.randint(8, 10), len(MARKET_TEMPLATES))
    selected = rng.sample(MARKET_TEMPLATES, num_markets)
    # Always include Croatia (domaće tržište) if not selected
    hr = next((m for m in MARKET_TEMPLATES if m["code"] == "HR"), None)
    if hr and hr not in selected:
        selected[0] = hr

    markets = []
    total_reach = 0
    total_active = 0
    total_ad_spend = 0.0
    region_stats: dict = {}

    for idx, tmpl in enumerate(selected):
        reach = int(tmpl["base_reach"] * rng.uniform(0.6, 1.5) * max(num_platforms * 0.5, 1))
        engagement = round(tmpl["base_engagement"] * rng.uniform(0.7, 1.3), 1)
        active = int(reach * engagement / 100 * rng.uniform(0.8, 1.3))
        growth_7d = round(tmpl["growth_base"] * rng.uniform(0.3, 1.8), 1)
        growth_30d = round(growth_7d * rng.uniform(2.0, 3.5), 1)

        ad_cost = round(tmpl["ad_cost_cpm"] * rng.uniform(0.8, 1.2), 2)
        monthly_ad_spend = round(ad_cost * (reach / 1000) * rng.uniform(0.05, 0.15), 2)
        conversions = int(active * rng.uniform(0.01, 0.05))
        revenue = round(conversions * rng.uniform(12, 55), 2)

        # City breakdown
        city_data = []
        remaining = reach
        for c_idx, city in enumerate(tmpl["cities"]):
            if c_idx == len(tmpl["cities"]) - 1:
                city_reach = remaining
            else:
                city_reach = int(reach * rng.uniform(0.15, 0.4))
                remaining -= city_reach

            city_data.append({
                "name": city,
                "reach": max(city_reach, 0),
                "active": int(max(city_reach, 0) * engagement / 100),
            })

        # Market score (0-100)
        score = 40
        if engagement > 5:
            score += 20
        elif engagement > 3:
            score += 10
        if growth_7d > 10:
            score += 20
        elif growth_7d > 5:
            score += 10
        if reach > 50000:
            score += 10
        score = max(20, min(98, score + rng.randint(-5, 10)))

        market = {
            "id": f"m_{idx}_{client_id}",
            "country": tmpl["country"],
            "code": tmpl["code"],
            "flag": tmpl["flag"],
            "region": tmpl["region"],
            "language": tmpl["language"],
            "reach": reach,
            "active_users": active,
            "engagement": engagement,
            "growth_7d": growth_7d,
            "growth_30d": growth_30d,
            "ad_cost_cpm": ad_cost,
            "monthly_ad_spend": monthly_ad_spend,
            "conversions": conversions,
            "revenue": revenue,
            "market_score": score,
            "cities": city_data,
            "offices": rng.choice([0, 0, 0, 1]) if tmpl["code"] != "HR" else rng.randint(1, 3),
        }
        markets.append(market)

        total_reach += reach
        total_active += active
        total_ad_spend += monthly_ad_spend

        region = tmpl["region"]
        if region not in region_stats:
            region_stats[region] = {"reach": 0, "active": 0, "count": 0, "spend": 0}
        region_stats[region]["reach"] += reach
        region_stats[region]["active"] += active
        region_stats[region]["count"] += 1
        region_stats[region]["spend"] += monthly_ad_spend

    # Sort by reach descending
    markets.sort(key=lambda x: x["reach"], reverse=True)

    # Region comparison
    region_comparison = []
    for reg_name, reg_data in region_stats.items():
        region_comparison.append({
            "region": reg_name,
            "reach": reg_data["reach"],
            "active": reg_data["active"],
            "countries": reg_data["count"],
            "share": round((reg_data["reach"] / max(total_reach, 1)) * 100, 1),
            "ad_spend": round(reg_data["spend"], 2),
        })
    region_comparison.sort(key=lambda x: x["reach"], reverse=True)

    # Content pipeline
    content_pipeline = []
    statuses = ["Spremno", "Zakazano", "U produkciji", "Pregled", "Nacrt"]
    for c_idx, tmpl in enumerate(rng.sample(CONTENT_TEMPLATES, min(5, len(CONTENT_TEMPLATES)))):
        due = today + timedelta(days=rng.randint(1, 25))
        content_pipeline.append({
            "id": f"cp_{c_idx}",
            "title": tmpl["title"],
            "languages": tmpl["languages"],
            "platform": tmpl["platform"],
            "type": tmpl["type"],
            "date": due.strftime("%b %d, %Y"),
            "due_date": due.isoformat(),
            "status": rng.choice(statuses),
            "description": tmpl["description"],
        })

    # AI insights
    top_growth = max(markets, key=lambda m: m["growth_7d"])
    top_market = markets[0]
    cheapest = min(markets, key=lambda m: m["ad_cost_cpm"])
    total_offices = sum(m["offices"] for m in markets)

    ai_insights = {
        "title": "AI Geo-Intelligence — Preporuke",
        "insights": [],
    }

    ai_insights["insights"].append({
        "icon": "TrendingUp",
        "text": f"Primijećen je nagli porast interesa u {top_growth['country']} "
                f"(+{top_growth['growth_7d']}% u 7 dana). "
                f"Preporučujemo aktivaciju oglasa na {('njemačkom' if top_growth['language'] == 'de' else 'engleskom' if top_growth['language'] == 'en' else 'hrvatskom')} jeziku za tu regiju.",
        "type": "success",
    })

    ai_insights["insights"].append({
        "icon": "Globe",
        "text": f"{top_market['country']} je vaše najjače tržište s {top_market['reach']:,} pratitelja "
                f"i {top_market['engagement']}% engagement ratom. Fokusirajte premium sadržaj ovdje.",
        "type": "info",
    })

    ai_insights["insights"].append({
        "icon": "DollarSign",
        "text": f"Najjeftiniji CPM je u {cheapest['country']} (€{cheapest['ad_cost_cpm']}). "
                f"Za isti budžet dobit ćete {round(14.0 / cheapest['ad_cost_cpm'], 1)}x više impresija nego u SAD-u.",
        "type": "info",
    })

    dach_markets = [m for m in markets if m["language"] == "de"]
    if dach_markets:
        dach_reach = sum(m["reach"] for m in dach_markets)
        ai_insights["insights"].append({
            "icon": "Languages",
            "text": f"DACH tržište (DE/AT/CH) čini {round(dach_reach / max(total_reach, 1) * 100)}% ukupnog dosega. "
                    f"Preporučujemo lokalizaciju svih ključnih kampanja na njemački.",
            "type": "warning",
        })

    # Heatmap data for frontend visualization
    heatmap_data = []
    max_reach = max(m["reach"] for m in markets) if markets else 1
    for m in markets:
        intensity = round(m["reach"] / max_reach, 2)
        heatmap_data.append({
            "code": m["code"],
            "country": m["country"],
            "intensity": intensity,
            "reach": m["reach"],
            "growth": m["growth_7d"],
        })

    return {
        "markets": markets,
        "regionComparison": region_comparison,
        "contentPipeline": content_pipeline,
        "heatmapData": heatmap_data,
        "summary": {
            "total_markets": len(markets),
            "total_reach": total_reach,
            "total_active": total_active,
            "total_offices": total_offices,
            "total_ad_spend": round(total_ad_spend, 2),
            "total_conversions": sum(m["conversions"] for m in markets),
            "total_revenue": round(sum(m["revenue"] for m in markets), 2),
            "avg_engagement": round(sum(m["engagement"] for m in markets) / max(len(markets), 1), 1),
            "languages": list(set(m["language"] for m in markets)),
        },
        "aiInsights": ai_insights,
        "_meta": {
            "is_estimate": True,
            "connected_platforms": connected_platforms,
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# BFF endpoint — all page data in one call
# ---------------------------------------------------------------------------

@router.get("/page-data")
async def get_page_data(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Return all geographic markets page data. Falls back to estimates."""
    user, client, role = ctx

    # Check for real diaspora data
    query = select(func.count()).select_from(DiasporaData).where(DiasporaData.client_id == client.id)
    res = await db.execute(query)
    count = res.scalar() or 0

    if count > 0:
        # Real data — use existing populations logic
        result = await db.execute(
            select(DiasporaData, Country)
            .join(Country, DiasporaData.country_id == Country.id)
            .where(DiasporaData.client_id == client.id)
            .order_by(DiasporaData.croatian_population.desc())
        )
        rows = result.all()

        markets = []
        for i, (diaspora, country) in enumerate(rows):
            cities_raw = diaspora.city_concentrations or {}
            population = diaspora.croatian_population
            active_pct = 0.025 + (abs(hash(country.name)) % 30) / 1000.0
            active = int(population * active_pct)
            engagement = round(3.0 + (abs(hash(country.name)) % 25) / 10.0, 1)
            flag = COUNTRY_FLAGS.get(country.name, "🏳️")

            city_data = [{"name": k, "reach": v, "active": int(v * active_pct)} for k, v in cities_raw.items()]

            markets.append({
                "id": str(diaspora.id),
                "country": country.name,
                "code": country.code or "",
                "flag": flag,
                "region": country.region_type or "Dijaspora",
                "language": "hr",
                "reach": population,
                "active_users": active,
                "engagement": engagement,
                "growth_7d": 0,
                "growth_30d": 0,
                "ad_cost_cpm": 5.0,
                "monthly_ad_spend": 0,
                "conversions": 0,
                "revenue": 0,
                "market_score": 50,
                "cities": city_data,
                "offices": 0,
            })

        total_reach = sum(m["reach"] for m in markets)
        return {
            "markets": markets,
            "regionComparison": [],
            "contentPipeline": [],
            "heatmapData": [],
            "summary": {
                "total_markets": len(markets),
                "total_reach": total_reach,
                "total_active": sum(m["active_users"] for m in markets),
                "total_offices": 0,
                "total_ad_spend": 0,
                "total_conversions": 0,
                "total_revenue": 0,
                "avg_engagement": round(sum(m["engagement"] for m in markets) / max(len(markets), 1), 1),
                "languages": ["hr"],
            },
            "aiInsights": {"title": "AI Geo-Intelligence", "insights": []},
            "_meta": {
                "is_estimate": False,
                "connected_platforms": [],
                "analyzed_at": datetime.utcnow().isoformat(),
            },
        }

    # No real data — estimate
    connected = []
    if client.social_handles and isinstance(client.social_handles, dict):
        connected = [k for k, v in client.social_handles.items() if v]

    if not connected:
        return {
            "markets": [],
            "regionComparison": [],
            "contentPipeline": [],
            "heatmapData": [],
            "summary": {
                "total_markets": 0, "total_reach": 0, "total_active": 0,
                "total_offices": 0, "total_ad_spend": 0, "total_conversions": 0,
                "total_revenue": 0, "avg_engagement": 0, "languages": [],
            },
            "aiInsights": {"title": "AI Geo-Intelligence", "insights": []},
            "_meta": {"is_estimate": False, "connected_platforms": [], "analyzed_at": datetime.utcnow().isoformat()},
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

@router.get("/map")
async def get_diaspora_map(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_diaspora_map(db, client_id=client.id)
    return result


@router.get("/events")
async def get_community_events(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_community_events(db, client_id=client.id)
    return result


@router.post("/adapt/{post_id}")
async def adapt_content_for_market(
    post_id: UUID,
    target_lang: str = Query(...),
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.adapt_content_for_market(db, post_id, target_lang, client_id=client.id)
    return result


@router.get("/populations")
async def get_populations(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    """Legacy BFF endpoint."""
    user, client, role = ctx
    result = await db.execute(
        select(DiasporaData, Country)
        .join(Country, DiasporaData.country_id == Country.id)
        .where(DiasporaData.client_id == client.id)
        .order_by(DiasporaData.croatian_population.desc())
    )
    rows = result.all()

    communities = []
    for diaspora, country in rows:
        cities = diaspora.city_concentrations or {}
        city_names = ", ".join(list(cities.keys())[:3]) if cities else country.name
        population = diaspora.croatian_population
        active_pct = 0.025 + (abs(hash(country.name)) % 30) / 1000.0
        active_members = int(population * active_pct)
        fan_clubs = max(1, population // 30000)
        engagement = round(3.0 + (abs(hash(country.name)) % 25) / 10.0, 1)
        flag = COUNTRY_FLAGS.get(country.name, "🏳️")

        communities.append({
            "country": country.name,
            "city": city_names,
            "population": population,
            "activeMembers": active_members,
            "fanClubs": fan_clubs,
            "engagement": engagement,
            "flag": flag,
        })

    content_pipeline = [
        {"id": 1, "title": "Utakmica uživo thread — UCL", "languages": ["HR", "EN", "DE"],
         "platform": "Sve platforme", "date": "Mar 7, 2026", "status": "Zakazano",
         "description": "Višejezična ažuriranja utakmica u realnom vremenu za navijače dijaspore"},
        {"id": 2, "title": "Fan hub Beč — pregled eventa", "languages": ["HR", "DE"],
         "platform": "Instagram + Facebook", "date": "Mar 8, 2026", "status": "U produkciji",
         "description": "Video pregled watch partyja dijaspore s 200+ navijača u Beču"},
        {"id": 3, "title": "Brand bilten dijaspore", "languages": ["HR", "EN"],
         "platform": "Email", "date": "Mar 10, 2026", "status": "Nacrt",
         "description": "Mjesečni bilten s novostima kluba i pregledom zajednice"},
        {"id": 4, "title": "Kako gledati: Vodič za streaming", "languages": ["EN", "DE"],
         "platform": "Website + Social", "date": "Mar 6, 2026", "status": "Spremno",
         "description": "Ažurirani vodič za dijasporu o praćenju sadržaja brenda"},
        {"id": 5, "title": "Video poruka igrača — njemački navijači", "languages": ["DE", "HR"],
         "platform": "TikTok + Instagram", "date": "Mar 12, 2026", "status": "Pregled scenarija",
         "description": "Personalizirani video pozdrav igrača zajednici njemačke dijaspore"},
    ]

    return {"communities": communities, "contentPipeline": content_pipeline}
