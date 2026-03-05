"""Mock Claude AI client returning pre-generated content plans, ad copies, and analyses."""

from __future__ import annotations

from app.integrations.base import ClaudeClientBase


class ClaudeMockClient(ClaudeClientBase):
    """Returns hardcoded but realistic AI-generated content for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "claude_ai", "mock": True}

    async def generate_content_plan(self, context: dict) -> dict:
        return {
            "plan_id": "plan_mock_20260305",
            "period": "2026-03-05 to 2026-03-11",
            "theme": "Europa League Quarter-Final Build-Up",
            "items": [
                {
                    "date": "2026-03-05",
                    "platform": "instagram",
                    "content_type": "carousel",
                    "topic": "Derby recap - best moments",
                    "caption": "3 goals, 1 unforgettable night. Relive every moment from the derby victory \u26bd\ud83d\udd25 Swipe for the highlights!",
                    "hashtags": ["#Dinamo", "#DerbyDay", "#HNL", "#Football", "#Zagreb"],
                    "best_time_to_post": "18:00 CET",
                    "visual_direction": "Dynamic action shots with blue overlay filter, score graphic on last slide",
                },
                {
                    "date": "2026-03-06",
                    "platform": "tiktok",
                    "content_type": "short_video",
                    "topic": "Players react to derby win",
                    "caption": "POV: You just beat your biggest rivals \ud83d\ude0f #Dinamo #Derby #Reaction",
                    "hashtags": ["#Dinamo", "#Derby", "#Football", "#Reaction", "#POV"],
                    "best_time_to_post": "12:00 CET",
                    "visual_direction": "Quick cuts of player celebrations, trending audio overlay",
                },
                {
                    "date": "2026-03-07",
                    "platform": "instagram",
                    "content_type": "story_series",
                    "topic": "Europa League countdown - 5 days to go",
                    "caption": "5 days until we write the next chapter in Europe \ud83c\udf1f",
                    "hashtags": ["#Dinamo", "#EuropaLeague", "#UEL", "#Countdown"],
                    "best_time_to_post": "10:00 CET",
                    "visual_direction": "Countdown graphic with European nights montage",
                },
                {
                    "date": "2026-03-08",
                    "platform": "youtube",
                    "content_type": "long_video",
                    "topic": "Road to the quarter-finals - full documentary",
                    "caption": "From the group stage to the quarter-finals: our complete European journey so far. Full documentary inside.",
                    "hashtags": ["#Dinamo", "#EuropaLeague", "#Documentary", "#Football"],
                    "best_time_to_post": "15:00 CET",
                    "visual_direction": "Cinematic documentary style, player interviews intercut with match footage",
                },
                {
                    "date": "2026-03-09",
                    "platform": "instagram",
                    "content_type": "reel",
                    "topic": "Training session - preparing for Roma",
                    "caption": "Locked in \ud83d\udd12 Training is INTENSE ahead of Thursday's clash. Let's go! \ud83d\udcaa",
                    "hashtags": ["#Dinamo", "#Training", "#EuropaLeague", "#Roma"],
                    "best_time_to_post": "17:00 CET",
                    "visual_direction": "High energy training clips, dramatic slow-mo shots",
                },
                {
                    "date": "2026-03-10",
                    "platform": "tiktok",
                    "content_type": "short_video",
                    "topic": "History of Dinamo vs Italian clubs",
                    "caption": "Every time Dinamo faced Italian teams \ud83c\uddee\ud83c\uddf9\u26bd #Dinamo #History #Football #UEL",
                    "hashtags": ["#Dinamo", "#History", "#EuropaLeague", "#Roma", "#Italian"],
                    "best_time_to_post": "19:00 CET",
                    "visual_direction": "Archival footage montage with modern graphics overlay",
                },
                {
                    "date": "2026-03-11",
                    "platform": "instagram",
                    "content_type": "image",
                    "topic": "Matchday graphic - Dinamo vs Roma",
                    "caption": "MATCHDAY \ud83d\udd35\u26aa DINAMO vs AS ROMA | Europa League Quarter-Final | 21:00 CET | Maksimir\n\nWho's coming? \ud83d\ude4b",
                    "hashtags": ["#Dinamo", "#Roma", "#UEL", "#Matchday", "#Zagreb"],
                    "best_time_to_post": "09:00 CET",
                    "visual_direction": "Bold matchday poster with both crests, stadium background, kick-off time",
                },
            ],
            "strategy_notes": (
                "This week's content leans heavily into the Europa League narrative. "
                "The derby win provides momentum and positive sentiment to carry into European "
                "content. Recommend increasing ad spend on Europa League content by 40% and "
                "targeting diaspora audiences in Germany and Austria. TikTok content should "
                "prioritize trending audio formats to maximize For You Page reach."
            ),
        }

    async def generate_post_copy(self, brief: dict) -> dict:
        platform = brief.get("platform", "instagram")
        tone = brief.get("tone", "energetic")
        return {
            "headline": "The road to glory runs through Maksimir",
            "body": (
                "Thursday night under the lights. 35,000 voices as one. "
                "This is what European football is all about.\n\n"
                "Dinamo vs AS Roma. Quarter-final. Our house.\n\n"
                "Get your tickets now and be part of history."
            ),
            "call_to_action": "Link in bio for tickets \ud83c\udfdf\ufe0f",
            "hashtags": ["#Dinamo", "#EuropaLeague", "#Roma", "#Maksimir", "#OurHouse"],
            "platform": platform,
            "tone": tone,
            "estimated_engagement": "high - European nights content historically performs 2.5x above average",
        }

    async def generate_ab_variants(self, base_copy: str, num_variants: int = 3) -> list[dict]:
        variants = [
            {
                "variant_id": "var_A",
                "label": "Emotion-driven",
                "copy": "35,000 hearts. One dream. Thursday night, we make history together. Dinamo vs Roma - be there.",
                "rationale": "Appeals to collective emotion and shared experience. Uses short, punchy sentences for impact.",
                "predicted_ctr": 3.8,
            },
            {
                "variant_id": "var_B",
                "label": "Urgency-focused",
                "copy": "Tickets are flying. Only 2,400 seats remaining for the biggest European night in years. Dinamo vs Roma, Thursday 21:00. Don't miss out.",
                "rationale": "Creates scarcity and urgency. FOMO-driven approach that works well for event tickets.",
                "predicted_ctr": 4.2,
            },
            {
                "variant_id": "var_C",
                "label": "Stats-powered",
                "copy": "7 wins. 0 defeats at home this season. 22 goals scored at Maksimir. Thursday we add another chapter. Dinamo vs Roma, Europa League QF.",
                "rationale": "Leverages impressive home record statistics to build confidence and excitement.",
                "predicted_ctr": 3.5,
            },
            {
                "variant_id": "var_D",
                "label": "Fan-centric",
                "copy": "YOU made the group stage electric. YOU roared us through the Round of 16. Now we need you one more time. Dinamo vs Roma. Our Maksimir. Our night.",
                "rationale": "Directly addresses fans, making them feel essential to the team's success.",
                "predicted_ctr": 4.0,
            },
        ]
        return variants[:num_variants]

    async def analyze_sentiment(self, texts: list[str]) -> list[dict]:
        mock_sentiments = [
            {
                "text": texts[0] if texts else "",
                "sentiment": "positive",
                "confidence": 0.92,
                "key_phrases": ["great performance", "amazing goals"],
                "emotion": "excitement",
            },
        ]
        for i, text in enumerate(texts[1:], start=1):
            sentiments = ["positive", "neutral", "negative", "positive", "positive"]
            confidences = [0.88, 0.75, 0.81, 0.94, 0.86]
            emotions = ["joy", "indifference", "frustration", "pride", "anticipation"]
            idx = i % len(sentiments)
            mock_sentiments.append(
                {
                    "text": text,
                    "sentiment": sentiments[idx],
                    "confidence": confidences[idx],
                    "key_phrases": [f"phrase_{i}_a", f"phrase_{i}_b"],
                    "emotion": emotions[idx],
                }
            )
        return mock_sentiments

    async def generate_report_summary(self, data: dict) -> str:
        return (
            "Weekly Performance Summary (Feb 27 - Mar 5, 2026)\n\n"
            "Overall social media performance showed strong growth this week, driven "
            "primarily by derby-related content. Instagram engagement rate peaked at 4.1% "
            "on matchday (vs. 2.8% weekly average), with the goal highlight reel generating "
            "22,150 likes - the highest-performing post this quarter.\n\n"
            "TikTok continues to be the fastest-growing channel with a 12% follower increase "
            "month-over-month. The 'players pronounce Croatian words' video went semi-viral "
            "with 3.4M views, demonstrating strong appetite for personality-driven content.\n\n"
            "Website traffic surged 34% on matchday with ticket pages seeing 2.3x normal "
            "traffic. Recommendation: allocate additional budget to retargeting visitors who "
            "viewed ticket pages but did not convert.\n\n"
            "Key Actions:\n"
            "1. Double down on behind-the-scenes and personality content on TikTok\n"
            "2. Increase Europa League ad spend by 40% ahead of Roma quarter-final\n"
            "3. Launch ticket retargeting campaign for unconverted matchday page visitors\n"
            "4. Schedule Instagram carousel recap of derby within 24 hours of final whistle"
        )

    async def generate_strategy_recommendation(self, performance_data: dict) -> dict:
        return {
            "summary": (
                "Current social strategy is performing above industry benchmarks for sports "
                "organizations. The primary opportunity lies in capitalizing on the Europa League "
                "run to accelerate international audience growth, particularly in German-speaking "
                "markets where there is an existing diaspora audience."
            ),
            "strengths": [
                "Instagram engagement rate (2.8%) is 1.4x the sports industry average (2.0%)",
                "TikTok growth rate of 12% MoM significantly outpaces competitors",
                "Strong matchday content pipeline with consistent posting cadence",
                "YouTube documentary-style content drives high watch time (avg 5:12 per video)",
            ],
            "weaknesses": [
                "Facebook page reach declining 8% MoM - needs platform-specific strategy refresh",
                "Website bounce rate of 42% on shop pages suggests UX friction",
                "Limited content localization for international audiences",
                "Ad creative refresh cycle is too slow (avg 21 days vs. recommended 7-10 days)",
            ],
            "opportunities": [
                "Europa League QF presents a 2-3 week window for massive international exposure",
                "Player personality content on TikTok has 3x viral potential vs. match content",
                "Merch cross-selling via Instagram Shopping is underutilized",
                "Email list (45K subscribers) is under-leveraged for ticket and merch campaigns",
            ],
            "recommended_actions": [
                {
                    "action": "Launch Europa League content series across all platforms",
                    "priority": "high",
                    "timeline": "immediate",
                    "expected_impact": "+25% engagement, +15% follower growth",
                    "budget_required": 2500.0,
                },
                {
                    "action": "A/B test new ad creatives with 7-day refresh cycle",
                    "priority": "high",
                    "timeline": "this week",
                    "expected_impact": "+18% CTR, -12% CPA",
                    "budget_required": 1000.0,
                },
                {
                    "action": "Implement Instagram Shopping tags on all product posts",
                    "priority": "medium",
                    "timeline": "within 2 weeks",
                    "expected_impact": "+30% shop page traffic from Instagram",
                    "budget_required": 0.0,
                },
                {
                    "action": "Create German and English language content variants for key posts",
                    "priority": "medium",
                    "timeline": "within 1 week",
                    "expected_impact": "+20% reach in DE/AT markets",
                    "budget_required": 500.0,
                },
            ],
            "projected_impact": {
                "follower_growth_30d": "+8-12%",
                "engagement_rate_change": "+0.3-0.5pp",
                "website_traffic_change": "+20-30%",
                "merch_revenue_change": "+15-25%",
                "estimated_roi": "3.2x on incremental spend",
            },
        }
