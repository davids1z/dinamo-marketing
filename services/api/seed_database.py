#!/usr/bin/env python3
"""
Comprehensive database seeder for Demo Brand Marketing Platform.
Populates all tables with realistic demo data so every page works.
Run: python seed_database.py
"""
import os
import sys
import uuid
import random
import json
from datetime import datetime, date, timedelta

# Ensure app is importable
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text, select as sa_select
from app.database import sync_engine, SyncSessionLocal
from app.models import (
    Base, Country, SportEvent, MarketAudience, DiasporaData, SearchTrend, MarketScore,
    SocialChannel, ChannelMetric, ChannelHealthScore,
    Competitor, CompetitorMetric, CompetitorAlert,
    FanProfile, FanSegment, FanLifecycleEvent,
    ContentPlan, ContentPost, ContentTemplate,
    Campaign, AdSet, Ad, ABTest,
    PostMetric, AdMetric, AttributionEvent,
    SentimentRecord, SentimentAlert, BrandMention, TrendingTopic,
    Poll, PollVote, UGCSubmission, FanSpotlight,
    AcademyPlayer, AcademyMatch, AcademyStat,
    OptimizationRule, OptimizationLog,
    WeeklyReport, MonthlyReport,
    Notification, User, PlatformSetting,
)
from app.models.client import Client, UserClient
from app.services.auth_service import hash_password


def seed():
    session = SyncSessionLocal()
    try:
        print("🌱 Starting comprehensive database seed...")

        # Check if already seeded
        existing = session.execute(text("SELECT COUNT(*) FROM campaigns")).scalar()
        if existing and existing > 0:
            print(f"⚠️  Database already has {existing} campaigns. Clearing and re-seeding...")
            # Clear tables in correct order (respect foreign keys)
            tables_to_clear = [
                'poll_votes', 'polls', 'predictions', 'ugc_submissions', 'fan_spotlights',
                'ad_metrics', 'post_metrics', 'attribution_events',
                'optimization_logs', 'optimization_rules',
                'ab_tests', 'ads', 'ad_sets', 'campaigns',
                'approval_actions', 'studio_projects', 'media_assets', 'content_posts', 'content_plans', 'content_templates',
                'sentiment_records', 'sentiment_alerts', 'brand_mentions', 'trending_topics',
                'competitor_alerts', 'competitor_metrics', 'competitors',
                'channel_health_scores', 'channel_metrics', 'social_channels',
                'fan_lifecycle_events', 'fan_profiles', 'fan_segments',
                'academy_matches', 'academy_players', 'academy_stats',
                'weekly_reports', 'monthly_reports',
                'notifications', 'platform_settings',
            ]
            for table in tables_to_clear:
                try:
                    session.execute(text(f"DELETE FROM {table}"))
                except Exception:
                    pass
            session.commit()

        now = datetime.utcnow()
        today = date.today()

        # Get or create default client
        client = session.execute(sa_select(Client).where(Client.slug == "demo-brand")).scalar_one_or_none()
        if not client:
            client = Client(
                name="Demo Brand",
                slug="demo-brand",
                is_active=True,
                business_description="Moderna marketinska platforma za demonstraciju mogucnosti sustava.",
                product_info="Digitalni marketing, sadrzaj za drustvene mreze, kampanje",
                tone_of_voice="Profesionalan, moderan, pristupacan publici",
                target_audience="Digitalno osvijesteni korisnici, 18-45 godina",
                brand_colors={
                    "primary": "#0A1A28",
                    "accent": "#B8FF00",
                    "blue": "#0057A8",
                },
                brand_fonts={
                    "headline": "Tektur",
                    "body": "Inter",
                    "code": "JetBrains Mono",
                },
                logo_url="/assets/brand-logo.svg",
                website_url="https://demo-brand.com",
                languages=["hr", "en", "de"],
                content_pillars=[
                    {"id": "product", "name": "Proizvod/usluga"},
                    {"id": "team_spotlight", "name": "Tim/ljudi"},
                    {"id": "behind_scenes", "name": "Iza kulisa"},
                    {"id": "community_engagement", "name": "Zajednica"},
                    {"id": "education", "name": "Edukacija"},
                    {"id": "lifestyle", "name": "Lifestyle"},
                    {"id": "campaigns", "name": "Kampanje"},
                    {"id": "values", "name": "Vrijednosti"},
                ],
                social_handles={
                    "instagram": "@demo_brand",
                    "facebook": "Demo Brand",
                    "tiktok": "@demo_brand",
                    "youtube": "Demo Brand",
                },
                hashtags=["#DemoBrand", "#OurBrand", "#Innovation"],
                ai_system_prompt_override="",
            )
            session.add(client)
            session.flush()
            print(f"  Created default client: {client.name} ({client.id})")
        else:
            print(f"  Using existing client: {client.name} ({client.id})")
        client_id = client.id

        # Ensure admin user exists and is linked to default client
        admin = session.execute(
            sa_select(User).where(User.email == "admin@shiftonezero.com")
        ).scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@shiftonezero.com",
                hashed_password=hash_password("shiftonezero2026"),
                full_name="ShiftOneZero Admin",
                role="admin",
                is_superadmin=True,
                is_active=True,
            )
            session.add(admin)
            session.flush()
            print(f"  Created admin user: {admin.email} (superadmin)")
        else:
            print(f"  Using existing admin user: {admin.email}")

        # Ensure admin <-> client membership
        membership = session.execute(
            sa_select(UserClient).where(
                UserClient.user_id == admin.id,
                UserClient.client_id == client_id,
            )
        ).scalar_one_or_none()
        if not membership:
            session.add(UserClient(user_id=admin.id, client_id=client_id, role="admin"))
            session.flush()
            print("  Linked admin user to default client")

        # ═══════════════════════════════════════════
        # 1. COMPETITORS
        # ═══════════════════════════════════════════
        print("  📊 Seeding competitors...")
        competitors_data = [
            ("Hajduk Split", "Hajduk", "Croatia", "HNL", "https://hajduk.hr", "⚪"),
            ("Rijeka", "Rijeka", "Croatia", "HNL", "https://nk-rijeka.hr", "⚪"),
            ("Osijek", "Osijek", "Croatia", "HNL", "https://nk-osijek.hr", "🔵"),
            ("Red Bull Salzburg", "Salzburg", "Austria", "Bundesliga", "https://redbullsalzburg.at", "🔴"),
            ("Ferencvaros", "Ferencvaros", "Hungary", "NB I", "https://frfradi.hu", "🟢"),
            ("Olympiacos", "Olympiacos", "Greece", "Super League", "https://olympiacos.org", "🔴"),
            ("Sheriff Tiraspol", "Sheriff", "Moldova", "Divizia Nationala", "https://sheriff.md", "⚫"),
            ("Crvena Zvezda", "C. Zvezda", "Serbia", "SuperLiga", "https://crvenazvezdafk.com", "🔴"),
        ]
        competitors = []
        for name, short, country, league, web, _ in competitors_data:
            c = Competitor(name=name, short_name=short, country=country, league=league, website=web, client_id=client_id)
            session.add(c)
            competitors.append(c)
        session.flush()

        # Competitor metrics (last 30 days)
        platforms = ["instagram", "facebook", "tiktok", "youtube"]
        for comp in competitors:
            for platform in platforms:
                base_followers = random.randint(50000, 800000)
                for i in range(30):
                    d = today - timedelta(days=29 - i)
                    cm = CompetitorMetric(
                        competitor_id=comp.id,
                        platform=platform,
                        date=d,
                        followers=base_followers + i * random.randint(50, 500),
                        engagement_rate=round(random.uniform(1.5, 6.0), 2),
                        content_formats={"reels": 40, "stories": 30, "posts": 20, "live": 10},
                        target_markets={"local": 60, "regional": 25, "global": 15},
                        language_strategy="Multi-language" if comp.country != "Croatia" else "Croatian + English",
                        client_id=client_id,
                    )
                    session.add(cm)

        # Competitor alerts
        alert_types = ["engagement_spike", "viral_post", "campaign_launch"]
        for comp in competitors[:4]:
            for i in range(random.randint(1, 3)):
                ca = CompetitorAlert(
                    competitor_id=comp.id,
                    alert_type=random.choice(alert_types),
                    description=f"{comp.short_name}: Nagli porast engagementa na Instagram - {random.randint(150, 400)}% iznad prosjeka",
                    engagement_spike=round(random.uniform(1.5, 4.0), 1),
                    detected_at=now - timedelta(hours=random.randint(1, 72)),
                    is_read=random.choice([True, False]),
                    client_id=client_id,
                )
                session.add(ca)

        # ═══════════════════════════════════════════
        # 2. SOCIAL CHANNELS (own brand)
        # ═══════════════════════════════════════════
        print("  📱 Seeding social channels...")
        channels_data = [
            ("instagram", "@demo_brand", "https://instagram.com/demo_brand", True),
            ("facebook", "Demo Brand", "https://facebook.com/demo_brand", True),
            ("tiktok", "@demo_brand", "https://tiktok.com/@demo_brand", True),
            ("youtube", "Demo Brand", "https://youtube.com/@demo_brand", True),
            ("web", "demo-brand.com", "https://demo-brand.com", True),
        ]
        channels = []
        for platform, handle, url, primary in channels_data:
            ch = SocialChannel(
                owner_type="own",
                platform=platform,
                handle=handle,
                url=url,
                is_primary=primary,
                client_id=client_id,
            )
            session.add(ch)
            channels.append(ch)
        session.flush()

        # Channel metrics (30 days)
        follower_bases = {
            "instagram": 380000, "facebook": 520000, "tiktok": 145000,
            "youtube": 95000, "web": 0,
        }
        for ch in channels:
            base = follower_bases.get(ch.platform, 100000)
            for i in range(30):
                d = today - timedelta(days=29 - i)
                is_match = i % 4 == 0
                cm = ChannelMetric(
                    channel_id=ch.id,
                    date=d,
                    followers=base + i * random.randint(100, 800),
                    avg_reach=random.randint(15000, 85000) + (50000 if is_match else 0),
                    engagement_rate=round(random.uniform(2.5, 7.5), 2),
                    posting_frequency=round(random.uniform(1.5, 4.0), 1),
                    demographics={"18-24": 28, "25-34": 35, "35-44": 22, "45+": 15},
                    top_posts=[],
                    format_breakdown={"reels": 35, "stories": 30, "carousel": 20, "single": 15},
                    client_id=client_id,
                )
                session.add(cm)

        # Channel health scores
        for ch in channels:
            for i in range(4):
                d = today - timedelta(days=i * 7)
                chs = ChannelHealthScore(
                    channel_id=ch.id,
                    date=d,
                    growth_score=round(random.uniform(60, 95), 1),
                    engagement_score=round(random.uniform(55, 90), 1),
                    content_quality_score=round(random.uniform(65, 92), 1),
                    audience_quality_score=round(random.uniform(70, 95), 1),
                    overall_score=round(random.uniform(65, 90), 1),
                    client_id=client_id,
                )
                session.add(chs)

        # ═══════════════════════════════════════════
        # 3. FAN PROFILES & SEGMENTS
        # ═══════════════════════════════════════════
        print("  👥 Seeding fan profiles & segments...")
        stages = ["new", "casual", "engaged", "superfan", "ambassador"]
        countries = ["Croatia", "Germany", "Austria", "USA", "Canada", "Switzerland", "Australia", "Sweden"]
        cities = ["Zagreb", "Split", "Berlin", "Vienna", "Chicago", "Toronto", "Zurich", "Sydney"]

        fan_profiles = []
        for i in range(100):
            stage = random.choices(stages, weights=[25, 30, 25, 15, 5])[0]
            country = random.choice(countries)
            fp = FanProfile(
                name=f"Fan_{i+1:03d}",
                email=f"fan{i+1}@example.com",
                country=country,
                city=random.choice(cities),
                age_range=random.choice(["18-24", "25-34", "35-44", "45+"]),
                platforms={"instagram": True, "facebook": random.choice([True, False]), "tiktok": random.choice([True, False])},
                first_seen=now - timedelta(days=random.randint(30, 365)),
                last_active=now - timedelta(days=random.randint(0, 60)),
                lifecycle_stage=stage,
                clv_score=round(random.uniform(5, 500), 2),
                external_ids={},
                client_id=client_id,
            )
            session.add(fp)
            fan_profiles.append(fp)

        # Fan segments
        segments_data = [
            ("Novi navijaci", {"stage": "new"}, 25, 15.0, 12.0, 5.2),
            ("Povremeni", {"stage": "casual"}, 30, 45.0, 8.5, 2.1),
            ("Aktivni navijaci", {"stage": "engaged"}, 25, 120.0, 5.0, 3.8),
            ("Superfanovi", {"stage": "superfan"}, 15, 280.0, 2.0, 8.5),
            ("Ambasadori", {"stage": "ambassador"}, 5, 450.0, 1.0, 12.0),
        ]
        for name, criteria, size, clv, churn, growth in segments_data:
            fs = FanSegment(
                name=name,
                criteria=criteria,
                size=size * 100,  # scale up
                avg_clv=clv,
                churn_rate=churn,
                growth_trend=growth,
                client_id=client_id,
            )
            session.add(fs)
        session.flush()

        # ═══════════════════════════════════════════
        # 4. CONTENT PLANS & POSTS
        # ═══════════════════════════════════════════
        print("  📅 Seeding content plans & posts...")

        # Content templates
        templates_data = [
            ("Matchday", "matchday", "Matchday Announcement", "instagram", "image", {"scenes": 3}),
            ("Matchday", "victory", "Victory Celebration", "instagram", "video", {"scenes": 4}),
            ("Academy", "spotlight", "Player Spotlight", "tiktok", "video", {"scenes": 3}),
            ("Brand", "quote", "Quote Card", "instagram", "image", {"scenes": 1}),
            ("Matchday", "lineup", "Starting Lineup", "instagram", "image", {"scenes": 2}),
            ("Fan", "ugc", "Fan Content Feature", "instagram", "carousel", {"scenes": 3}),
        ]
        templates = []
        for cat, subcat, name, plat, fmt, struct in templates_data:
            t = ContentTemplate(category=cat, subcategory=subcat, name=name, platform=plat, format_type=fmt, structure=struct, client_id=client_id)
            session.add(t)
            templates.append(t)
        session.flush()

        # Content plan for current month
        plan = ContentPlan(
            month=today.month,
            year=today.year,
            status="active",
            total_posts=30,
            approved_count=22,
            published_count=15,
            created_by="ai",
            client_id=client_id,
        )
        session.add(plan)
        session.flush()

        # Previous month plan
        prev_month = today.month - 1 if today.month > 1 else 12
        prev_year = today.year if today.month > 1 else today.year - 1
        plan_prev = ContentPlan(
            month=prev_month,
            year=prev_year,
            status="completed",
            total_posts=28,
            approved_count=28,
            published_count=28,
            created_by="ai",
            client_id=client_id,
        )
        session.add(plan_prev)
        session.flush()

        # Content posts
        post_titles = [
            ("Product launch announcement: Spring Collection", "instagram", "matchday"),
            ("Highlights: Campaign phase 1", "youtube", "matchday"),
            ("New collection 2026/27 - reveal", "tiktok", "brand"),
            ("Academy: Intern team wins 3 awards", "instagram", "academy"),
            ("Customer appreciation event", "instagram", "fan_engagement"),
            ("Interview: CEO on the year ahead", "youtube", "behind_the_scenes"),
            ("Weekly analytics", "instagram", "analytics"),
            ("International meetup Vienna", "facebook", "diaspora"),
            ("Year in review - infographic", "instagram", "brand"),
            ("Live Q&A with the team", "tiktok", "fan_engagement"),
            ("Partnership news", "instagram", "news"),
            ("Academy intern showcase", "youtube", "academy"),
            ("Launch day atmosphere - Reel", "instagram", "matchday"),
            ("Customer spotlight: Most loyal customer", "instagram", "fan_engagement"),
            ("Competitor analysis", "youtube", "matchday"),
            ("Workshop behind the scenes", "tiktok", "behind_the_scenes"),
            ("Annual membership - promotion", "facebook", "commercial"),
            ("Best products compilation", "tiktok", "matchday"),
            ("Demo Brand quiz", "instagram", "fan_engagement"),
            ("Press conference", "youtube", "news"),
            ("Story poll: Product of the month", "instagram", "fan_engagement"),
            ("Academy newsletter", "facebook", "academy"),
            ("Campaign journey vlog", "tiktok", "diaspora"),
            ("Behind the launch - vlog", "youtube", "behind_the_scenes"),
            ("Fan shop promotion", "instagram", "commercial"),
            ("Return of team member", "instagram", "news"),
            ("Launch day - countdown", "tiktok", "matchday"),
            ("Monthly statistics review", "instagram", "analytics"),
            ("Creative contest", "instagram", "fan_engagement"),
            ("Press conference highlights", "youtube", "news"),
        ]

        posts = []
        statuses = ["published", "published", "published", "published", "published",
                     "approved", "approved", "scheduled", "draft", "pending_review"]
        for i, (title, platform, pillar) in enumerate(post_titles):
            sched = now - timedelta(days=random.randint(-7, 20))
            status = statuses[i % len(statuses)]
            published_at = sched if status == "published" else None

            post = ContentPost(
                plan_id=plan.id if i < 20 else plan_prev.id,
                title=title,
                platform=platform,
                content_pillar=pillar,
                scheduled_at=sched,
                published_at=published_at,
                status=status,
                caption_hr=f"🔵⚪ {title} #DemoBrand #OurBrand #Innovation",
                caption_en=f"🔵⚪ {title} #DemoBrand #OurBrand #Innovation",
                hashtags=["Demo Brand", "DemoBrand", "Zagreb", "HNL", pillar],
                cta_text="Learn more na demo-brand.com",
                visual_brief=f"Visual za: {title}",
                is_champions_league="UCL" in title or "Champions" in title,
                is_academy="Academy" in title or "Akademija" in title or "academy" in pillar,
                client_id=client_id,
            )
            session.add(post)
            posts.append(post)
        session.flush()

        # ═══════════════════════════════════════════
        # 5. POST METRICS
        # ═══════════════════════════════════════════
        print("  📈 Seeding post metrics...")
        published_posts = [p for p in posts if p.status == "published"]
        for post in published_posts:
            # Multiple metric snapshots per post (hourly-like)
            for h in range(random.randint(5, 15)):
                ts = post.published_at + timedelta(hours=h * 4) if post.published_at else now
                impressions = random.randint(5000, 150000)
                reach = int(impressions * random.uniform(0.6, 0.9))
                likes = int(reach * random.uniform(0.02, 0.08))
                comments = int(likes * random.uniform(0.05, 0.15))
                shares = int(likes * random.uniform(0.02, 0.08))
                saves = int(likes * random.uniform(0.1, 0.3))
                clicks = int(reach * random.uniform(0.01, 0.04))
                eng_rate = round((likes + comments + shares + saves) / reach * 100, 2) if reach > 0 else 0

                pm = PostMetric(
                    post_id=post.id,
                    timestamp=ts,
                    impressions=impressions,
                    reach=reach,
                    likes=likes,
                    comments=comments,
                    shares=shares,
                    saves=saves,
                    clicks=clicks,
                    engagement_rate=eng_rate,
                    new_followers_attributed=random.randint(0, 50),
                    client_id=client_id,
                )
                session.add(pm)

        # ═══════════════════════════════════════════
        # 6. CAMPAIGNS & ADS
        # ═══════════════════════════════════════════
        print("  🎯 Seeding campaigns & ads...")
        campaigns_data = [
            ("Spring Campaign launch", "meta", "awareness", "active", 500, 15000, 8200),
            ("New collection launch", "meta", "conversions", "active", 300, 9000, 4500),
            ("Academy Talent Pipeline", "tiktok", "awareness", "active", 200, 6000, 3100),
            ("Annual membership 2026", "meta", "conversions", "paused", 400, 12000, 7800),
            ("International engagement", "meta", "traffic", "active", 150, 4500, 2200),
            ("Brand Shop promotion", "meta", "conversions", "completed", 250, 7500, 7500),
            ("Campaign event package", "tiktok", "awareness", "active", 180, 5400, 1800),
        ]

        campaigns = []
        for name, platform, objective, status, daily, max_b, spent in campaigns_data:
            camp = Campaign(
                name=name,
                platform=platform,
                objective=objective,
                status=status,
                daily_budget=daily,
                max_budget=max_b,
                total_spend=spent,
                start_date=today - timedelta(days=random.randint(5, 30)),
                end_date=today + timedelta(days=random.randint(10, 60)),
                client_id=client_id,
            )
            session.add(camp)
            campaigns.append(camp)
        session.flush()

        # Ad sets and ads for each campaign
        for camp in campaigns:
            for j in range(random.randint(1, 3)):
                adset = AdSet(
                    campaign_id=camp.id,
                    name=f"{camp.name} - AdSet {j+1}",
                    targeting={"age": "18-45", "interests": ["football", "sports"], "countries": ["HR", "DE", "AT"]},
                    placement="automatic",
                    status="active" if camp.status == "active" else camp.status,
                    budget=camp.daily_budget / (j + 1),
                    audience_size=random.randint(50000, 500000),
                    client_id=client_id,
                )
                session.add(adset)
                session.flush()

                variants = ["A", "B", "C"]
                ads = []
                for v in variants[:random.randint(2, 3)]:
                    ad = Ad(
                        ad_set_id=adset.id,
                        variant_label=v,
                        headline=f"{camp.name} - Varijanta {v}",
                        description=f"Demo Brandva kampanja - kreativa {v}",
                        cta="Learn more" if camp.objective == "awareness" else "Shop now",
                        status="active",
                        client_id=client_id,
                    )
                    session.add(ad)
                    ads.append(ad)
                session.flush()

                # Ad metrics
                for ad in ads:
                    for d in range(min(15, (today - camp.start_date).days + 1)):
                        day = camp.start_date + timedelta(days=d)
                        impressions = random.randint(5000, 50000)
                        clicks = int(impressions * random.uniform(0.01, 0.05))
                        spend = round(random.uniform(10, 80), 2)
                        conversions = int(clicks * random.uniform(0.02, 0.12))
                        am = AdMetric(
                            ad_id=ad.id,
                            timestamp=datetime.combine(day, datetime.min.time()),
                            impressions=impressions,
                            reach=int(impressions * random.uniform(0.7, 0.95)),
                            clicks=clicks,
                            ctr=round(clicks / impressions * 100, 2) if impressions > 0 else 0,
                            cpc=round(spend / clicks, 2) if clicks > 0 else 0,
                            cpm=round(spend / impressions * 1000, 2) if impressions > 0 else 0,
                            spend=spend,
                            conversions=conversions,
                            conversion_value=round(conversions * random.uniform(15, 80), 2),
                            roas=round(conversions * random.uniform(15, 80) / spend, 2) if spend > 0 else 0,
                            frequency=round(random.uniform(1.2, 3.5), 1),
                            video_views=random.randint(500, 15000) if "tiktok" in camp.platform else 0,
                            video_completion_rate=round(random.uniform(20, 65), 1),
                            client_id=client_id,
                        )
                        session.add(am)

            # A/B test for first 3 campaigns
            if camp == campaigns[0] or camp == campaigns[1]:
                ab = ABTest(
                    campaign_id=camp.id,
                    status="running",
                    confidence_pct=round(random.uniform(75, 95), 1),
                    started_at=now - timedelta(days=7),
                    client_id=client_id,
                )
                session.add(ab)

        # ═══════════════════════════════════════════
        # 7. SENTIMENT & SOCIAL LISTENING
        # ═══════════════════════════════════════════
        print("  💬 Seeding sentiment & social listening...")
        sentiment_texts = [
            ("Demo Brand is the best in the industry!", "positive", "instagram"),
            ("Fantastic product launch, great work team!", "positive", "facebook"),
            ("The design team is incredible", "positive", "twitter"),
            ("Poor customer service again, this is unacceptable", "negative", "twitter"),
            ("When is the next product drop?", "neutral", "instagram"),
            ("The new collection looks amazing!", "positive", "tiktok"),
            ("The prices are too high", "negative", "facebook"),
            ("The academy produces top talent", "positive", "youtube"),
            ("Demo Brand deserves more industry recognition", "neutral", "facebook"),
            ("The brand community is magical", "positive", "instagram"),
            ("The strategy today was a disaster", "negative", "twitter"),
            ("Proud of our brand! Go Demo Brand!", "positive", "instagram"),
            ("Embarrassing launch, no creativity", "negative", "twitter"),
            ("Great event organization for customers", "positive", "facebook"),
            ("We need a better online store", "neutral", "facebook"),
        ]

        for i in range(60):
            text_data = random.choice(sentiment_texts)
            sr = SentimentRecord(
                source_type="mention",
                platform=text_data[2],
                text=text_data[0],
                language="hr",
                sentiment=text_data[1],
                confidence=round(random.uniform(0.75, 0.98), 2),
                topics={"club": True, "match": random.choice([True, False])},
                analyzed_at=now - timedelta(hours=random.randint(0, 168)),
                client_id=client_id,
            )
            session.add(sr)

        # Brand mentions
        mention_authors = [
            ("@FootballCroatia", "twitter", "positive", 12400),
            ("@balkan_football_daily", "instagram", "positive", 8900),
            ("Demo Brand Fan Club Vienna", "facebook", "positive", 3200),
            ("@hrvatski_sport", "tiktok", "negative", 45000),
            ("Balkan Sports TV", "youtube", "neutral", 18500),
            ("@demobrandfanpage", "instagram", "positive", 6700),
            ("Croatian Football News", "facebook", "neutral", 4100),
            ("@brand_fan_zone", "twitter", "positive", 22000),
        ]
        for author, platform, sentiment, reach in mention_authors:
            bm = BrandMention(
                platform=platform,
                author=author,
                text=f"Comment about Demo Brand - {sentiment} sentiment",
                url=f"https://{platform}.com/post/{random.randint(1000,9999)}",
                sentiment=sentiment,
                reach_estimate=reach,
                is_influencer=reach > 10000,
                detected_at=now - timedelta(hours=random.randint(0, 48)),
                client_id=client_id,
            )
            session.add(bm)

        # Trending topics
        topics_data = [
            ("#Demo BrandZagreb", 4250, 32.0, "raste"),
            ("#SpringCampaign", 3800, 28.0, "raste"),
            ("Lead Designer", 2100, 65.0, "u porastu"),
            ("#FlagshipStore", 1450, 12.0, "stabilno"),
            ("#Industry", 1200, 8.0, "stabilno"),
            ("#DemoBrandAcademy", 890, 45.0, "raste"),
            ("Transfer Rumors", 760, 120.0, "u porastu"),
            ("#NewCollection", 650, 200.0, "u porastu"),
            ("#AjmoDemo Brand", 1800, 15.0, "stabilno"),
            ("Brand strategy", 420, 35.0, "raste"),
        ]
        for topic, vol, growth, _ in topics_data:
            tt = TrendingTopic(
                topic=topic,
                volume=vol,
                growth_rate=growth,
                related_keywords={"related": [topic.lower()]},
                first_detected=now - timedelta(days=random.randint(1, 14)),
                last_updated=now - timedelta(hours=random.randint(0, 6)),
                client_id=client_id,
            )
            session.add(tt)

        # Sentiment alerts
        sa = SentimentAlert(
            alert_type="spike_negative",
            severity="medium",
            description="Rise in negative sentiment about product quality in latest release",
            triggered_at=now - timedelta(hours=12),
            is_resolved=False,
            client_id=client_id,
        )
        session.add(sa)

        # ═══════════════════════════════════════════
        # 8. ACADEMY
        # ═══════════════════════════════════════════
        print("  🎓 Seeding academy...")
        players_data = [
            ("Luka Designer A", 2005, "CM", "U21", True, {"appearances": 18, "goals": 5, "assists": 7}),
            ("Mateo Designer C", 2007, "CB", "U19", True, {"appearances": 22, "goals": 1, "assists": 2}),
            ("Ivan Designer B", 2005, "RW", "U21", True, {"appearances": 15, "goals": 8, "assists": 3}),
            ("Ante Radovic", 2007, "GK", "U19", False, {"appearances": 20, "goals": 0, "assists": 0}),
            ("Filip Bozic", 2005, "LB", "U21", False, {"appearances": 16, "goals": 0, "assists": 4}),
            ("Marko Perisic", 2009, "ST", "U17", True, {"appearances": 12, "goals": 11, "assists": 2}),
            ("Dario Kovacevic", 2007, "AM", "U19", True, {"appearances": 19, "goals": 6, "assists": 8}),
            ("Josip Vukovic", 2005, "DM", "U21", False, {"appearances": 21, "goals": 2, "assists": 5}),
            ("Nikola Babic", 2009, "RB", "U17", False, {"appearances": 10, "goals": 0, "assists": 3}),
            ("Tomislav Maric", 2007, "LW", "U19", True, {"appearances": 14, "goals": 4, "assists": 6}),
        ]
        academy_players = []
        for name, year, pos, level, featured, stats in players_data:
            ap = AcademyPlayer(
                name=name,
                birth_year=year,
                position=pos,
                team_level=level,
                joined_date=date(year + 10, 7, 1),
                stats=stats,
                is_featured=featured,
                client_id=client_id,
            )
            session.add(ap)
            academy_players.append(ap)

        # Academy matches
        matches_data = [
            ("NK Lokomotiva U19", "U19", "3-1", {"scorers": ["Kovacevic 2x", "Maric"]}),
            ("Hajduk Split U19", "U19", "2-2", {"scorers": ["Kovacevic", "Designer C"]}),
            ("Red Bull Salzburg U19", "U19", "1-0", {"scorers": ["Designer B"]}),
            ("NK Osijek U17", "U17", "4-0", {"scorers": ["Perisic 3x", "Babic"]}),
            ("Ferencvaros U19", "U19", "2-1", {"scorers": ["Designer A", "Designer B"]}),
        ]
        for opp, level, result, scorers in matches_data:
            am = AcademyMatch(
                opponent=opp,
                date=today - timedelta(days=random.randint(3, 30)),
                team_level=level,
                result=result,
                scorers=scorers,
                highlights={"key_moments": ["Goal", "Save", "Tackle"]},
                client_id=client_id,
            )
            session.add(am)

        # Academy stats
        astat = AcademyStat(
            period="2025-26",
            players_promoted=8,
            players_sold=3,
            transfer_revenue=45000000,
            active_camps={"summer": True, "winter": True, "elite": True, "community": True},
            client_id=client_id,
        )
        session.add(astat)

        # ═══════════════════════════════════════════
        # 9. REPORTS
        # ═══════════════════════════════════════════
        print("  📋 Seeding reports...")
        # Weekly reports (last 6 weeks)
        for w in range(6):
            ws = today - timedelta(weeks=w, days=today.weekday())
            we = ws + timedelta(days=6)
            wr = WeeklyReport(
                week_start=ws,
                week_end=we,
                client_id=client_id,
                data={
                    "total_reach": random.randint(800000, 2500000),
                    "total_engagement": random.randint(40000, 150000),
                    "new_followers": random.randint(500, 3000),
                    "posts_published": random.randint(15, 30),
                    "engagement_rate": round(random.uniform(3.5, 7.0), 1),
                    "top_platform": random.choice(["Instagram", "TikTok", "YouTube"]),
                    "sentiment_positive": random.randint(60, 85),
                    "sentiment_neutral": random.randint(10, 25),
                    "sentiment_negative": random.randint(5, 15),
                    "ad_spend": round(random.uniform(2000, 8000), 2),
                    "roas": round(random.uniform(2.5, 6.0), 1),
                },
                top_posts=[
                    {"title": "Campaign highlights reel", "reach": random.randint(100000, 500000), "engagement": random.randint(5000, 30000)},
                    {"title": "New collection reveal", "reach": random.randint(80000, 300000), "engagement": random.randint(4000, 20000)},
                    {"title": "Academy talent spotlight", "reach": random.randint(50000, 200000), "engagement": random.randint(3000, 15000)},
                ],
                top_ads=[
                    {"name": "Spring Campaign", "roas": round(random.uniform(3.0, 7.0), 1), "spend": round(random.uniform(500, 2000), 2)},
                ],
                recommendations={
                    "items": [
                        "Povecajte ucestalost TikTok objava - visoki engagement",
                        "Leverage campaign milestones for engagement boost",
                        "Razmotrite nove Instagram Reels formate",
                    ]
                },
                generated_at=datetime.combine(we + timedelta(days=1), datetime.min.time()),
            )
            session.add(wr)

        # Monthly reports (last 3 months)
        for m in range(3):
            month = today.month - m if today.month - m > 0 else today.month - m + 12
            year = today.year if today.month - m > 0 else today.year - 1
            mr = MonthlyReport(
                month=month,
                year=year,
                client_id=client_id,
                data={
                    "total_reach": random.randint(3000000, 10000000),
                    "total_engagement": random.randint(200000, 600000),
                    "new_followers": random.randint(2000, 10000),
                    "posts_published": random.randint(60, 120),
                    "avg_engagement_rate": round(random.uniform(3.5, 6.5), 1),
                    "total_ad_spend": round(random.uniform(10000, 35000), 2),
                    "total_conversions": random.randint(200, 1500),
                    "avg_roas": round(random.uniform(3.0, 6.0), 1),
                },
                competitor_comparison={
                    "own_engagement": round(random.uniform(4.0, 6.5), 1),
                    "avg_competitor_engagement": round(random.uniform(2.5, 4.0), 1),
                    "own_growth": round(random.uniform(3.0, 8.0), 1),
                    "avg_competitor_growth": round(random.uniform(1.0, 3.0), 1),
                },
                ai_strategy={
                    "recommendations": [
                        "Fokusirajte se na video sadrzaj - 2.5x veci engagement",
                        "Dijaspora kampanje imaju najnizi CPA",
                        "TikTok raste najbrze - povecajte investiciju",
                    ]
                },
                generated_at=datetime(year, month, 28, 8, 0),
            )
            session.add(mr)

        # ═══════════════════════════════════════════
        # 10. OPTIMIZATION RULES
        # ═══════════════════════════════════════════
        print("  ⚙️  Seeding optimization rules...")
        rules_data = [
            ("AB Test Winner", {"min_confidence": 90, "min_impressions": 5000}, "scale", {"budget_multiplier": 1.5}),
            ("Low CTR Pause", {"max_ctr": 0.5, "min_spend": 50}, "pause", {}),
            ("High ROAS Scale", {"min_roas": 4.0, "min_conversions": 10}, "scale", {"budget_multiplier": 2.0}),
            ("Ad Fatigue Refresh", {"max_frequency": 3.0, "ctr_decline": 20}, "refresh", {}),
            ("Budget Reallocation", {"time_check": "weekly"}, "reallocate", {"method": "performance_based"}),
        ]
        for name, cond, action, params in rules_data:
            rule = OptimizationRule(
                name=name,
                condition=cond,
                action_type=action,
                action_params=params,
                is_active=True,
                client_id=client_id,
            )
            session.add(rule)

        # ═══════════════════════════════════════════
        # 11. NOTIFICATIONS
        # ═══════════════════════════════════════════
        print("  🔔 Seeding notifications...")
        notifs_data = [
            ("Campaign 'Spring Launch' reached 80% of budget", "campaign_budget", "warning", "Budzetno upozorenje"),
            ("Tjedni izvjestaj generiran", "weekly_report", "info", "Izvjestaj spreman"),
            ("Negativni sentiment u porastu - sudjenje tema", "sentiment_alert", "warning", "Sentiment upozorenje"),
            ("Competitor Alpha: engagement spike detected", "competitor_alert", "info", "Konkurent alert"),
            ("3 objave cekaju odobrenje", "content_approval", "info", "Sadrzaj ceka"),
            ("Novi dres objava objavljena na Instagram", "content_published", "info", "Objavljeno"),
            ("TikTok kampanja: ROAS 5.2x - preporuka skaliranja", "optimization", "info", "Optimizacija"),
        ]
        for body, ntype, severity, title in notifs_data:
            n = Notification(
                type=ntype,
                title=title,
                body=body,
                severity=severity,
                is_read=random.choice([True, False]),
                client_id=client_id,
            )
            session.add(n)

        # ═══════════════════════════════════════════
        # 12. PLATFORM SETTINGS
        # ═══════════════════════════════════════════
        print("  ⚙️  Seeding platform settings...")
        settings_data = [
            ("api_mode_meta", "mock", "api"),
            ("api_mode_tiktok", "mock", "api"),
            ("api_mode_youtube", "mock", "api"),
            ("api_mode_ga4", "mock", "api"),
            ("api_mode_sports_data", "mock", "api"),
            ("api_mode_claude", "mock", "api"),
            ("api_mode_buffer", "mock", "api"),
            ("api_mode_image_gen", "mock", "api"),
            ("api_mode_trends", "mock", "api"),
            ("notif_sentiment_alert", "true", "notification"),
            ("notif_campaign_budget", "true", "notification"),
            ("notif_weekly_report", "true", "notification"),
            ("notif_mention_spike", "true", "notification"),
            ("notif_competitor_alert", "true", "notification"),
            ("notif_content_approval", "true", "notification"),
        ]
        for key, value, category in settings_data:
            ps = PlatformSetting(key=key, value=value, category=category)
            session.add(ps)

        # ═══════════════════════════════════════════
        # 13. POLLS & ENGAGEMENT
        # ═══════════════════════════════════════════
        print("  🗳️  Seeding polls & engagement...")
        poll = Poll(
            question="Who delivered the best work this quarter?",
            options={"options": ["Lead Designer", "Designer A", "Designer B", "Designer C"]},
            platform="instagram",
            status="active",
            starts_at=now - timedelta(days=1),
            ends_at=now + timedelta(days=2),
            total_votes=1247,
            client_id=client_id,
        )
        session.add(poll)
        session.flush()

        poll2 = Poll(
            question="Koji format sadrzaja preferirate?",
            options={"options": ["Video highlights", "Foto galerija", "Statistike", "Iza kulisa"]},
            platform="all",
            status="closed",
            starts_at=now - timedelta(days=7),
            ends_at=now - timedelta(days=4),
            total_votes=3456,
            client_id=client_id,
        )
        session.add(poll2)

        # UGC submissions
        ugc_data = [
            ("demo_brand_fan_art", "instagram", "@art_demo_brand_fan", "positive"),
            ("matchday_photo", "instagram", "@brand_community", "positive"),
            ("chant_video", "tiktok", "@brandloversforever", "positive"),
        ]
        for hashtag, platform, author, sent in ugc_data:
            ugc = UGCSubmission(
                campaign_hashtag=f"#{hashtag}",
                platform=platform,
                author=author,
                content_url=f"https://{platform}.com/p/{random.randint(10000,99999)}",
                sentiment=sent,
                is_featured=random.choice([True, False]),
                submitted_at=now - timedelta(days=random.randint(0, 14)),
                client_id=client_id,
            )
            session.add(ugc)

        # ═══════════════════════════════════════════
        # 14. ATTRIBUTION EVENTS
        # ═══════════════════════════════════════════
        print("  🎯 Seeding attribution events...")
        conv_types = ["ticket_purchase", "merch_purchase", "registration", "newsletter_signup"]
        touch_channels = ["instagram_organic", "facebook_ad", "tiktok_organic", "google_search", "email", "youtube_ad"]
        for _ in range(50):
            seq_len = random.randint(1, 5)
            sequence = random.sample(touch_channels, min(seq_len, len(touch_channels)))
            ae = AttributionEvent(
                channel_sequence={"touches": sequence},
                first_touch_channel=sequence[0],
                last_touch_channel=sequence[-1],
                conversion_type=random.choice(conv_types),
                conversion_value=round(random.uniform(10, 200), 2),
                occurred_at=now - timedelta(days=random.randint(0, 30)),
                client_id=client_id,
            )
            session.add(ae)

        # ═══════════════════════════════════════════
        # COMMIT ALL
        # ═══════════════════════════════════════════
        session.commit()
        print("\n✅ Database seeded successfully!")
        print(f"   - Client: {client.name} (slug={client.slug}, id={client_id})")
        print(f"   - {len(competitors)} competitors with 30-day metrics")
        print(f"   - {len(channels)} social channels with metrics & health scores")
        print(f"   - {len(fan_profiles)} fan profiles, 5 segments")
        print(f"   - 2 content plans, {len(posts)} content posts")
        print(f"   - {len(campaigns)} campaigns with ad sets, ads & metrics")
        print(f"   - 60 sentiment records, {len(mention_authors)} brand mentions, {len(topics_data)} trending topics")
        print(f"   - {len(players_data)} academy players, 5 matches")
        print(f"   - 6 weekly reports, 3 monthly reports")
        print(f"   - 5 optimization rules")
        print(f"   - 7 notifications")
        print(f"   - 2 polls, 3 UGC submissions")
        print(f"   - 50 attribution events")
        print(f"   - 15 platform settings")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
