"""Mock Claude AI client returning pre-generated content plans, ad copies, and analyses."""

from __future__ import annotations

from app.integrations.base import ClaudeClientBase


class ClaudeMockClient(ClaudeClientBase):
    """Returns hardcoded but realistic AI-generated content for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "claude_ai", "mock": True}

    async def generate_content_plan(self, context: dict, client=None) -> dict:
        return {
            "plan_id": "plan_mock_20260305",
            "period": "2026-03-05 to 2026-03-11",
            "theme": "Spring Campaign Launch Build-Up",
            "items": [
                {
                    "date": "2026-03-05",
                    "platform": "instagram",
                    "content_type": "carousel",
                    "topic": "Launch recap - best moments",
                    "caption": "3 goals, 1 unforgettable night. Relive every moment from the launch event victory ⚽🔥 Swipe for the highlights!",
                    "hashtags": ["#DemoBrand", "#LaunchDay", "#HNL", "#Football", "#Zagreb"],
                    "best_time_to_post": "18:00 CET",
                    "visual_direction": "Dynamic action shots with blue overlay filter, score graphic on last slide",
                },
                {
                    "date": "2026-03-06",
                    "platform": "tiktok",
                    "content_type": "short_video",
                    "topic": "Players react to launch event win",
                    "caption": "POV: You just beat your biggest rivals 😏 #DemoBrand #Launch #Reaction",
                    "hashtags": ["#DemoBrand", "#Launch", "#Football", "#Reaction", "#POV"],
                    "best_time_to_post": "12:00 CET",
                    "visual_direction": "Quick cuts of player celebrations, trending audio overlay",
                },
                {
                    "date": "2026-03-07",
                    "platform": "instagram",
                    "content_type": "story_series",
                    "topic": "Spring Campaign countdown - 5 days to go",
                    "caption": "5 days until we write the next chapter in Europe 🌟",
                    "hashtags": ["#DemoBrand", "#SpringCampaign", "#NewCollection", "#Countdown"],
                    "best_time_to_post": "10:00 CET",
                    "visual_direction": "Countdown graphic with campaign launches montage",
                },
                {
                    "date": "2026-03-08",
                    "platform": "youtube",
                    "content_type": "long_video",
                    "topic": "Road to the quarter-finals - full documentary",
                    "caption": "From the group stage to the quarter-finals: our complete global journey so far. Full documentary inside.",
                    "hashtags": ["#DemoBrand", "#SpringCampaign", "#Documentary", "#Football"],
                    "best_time_to_post": "15:00 CET",
                    "visual_direction": "Cinematic documentary style, player interviews intercut with match footage",
                },
                {
                    "date": "2026-03-09",
                    "platform": "instagram",
                    "content_type": "reel",
                    "topic": "Training session - preparing for Spring Collection",
                    "caption": "Locked in 🔒 Training is INTENSE ahead of Thursday's clash. Let's go! 💪",
                    "hashtags": ["#DemoBrand", "#Training", "#SpringCampaign", "#Spring Collection"],
                    "best_time_to_post": "17:00 CET",
                    "visual_direction": "High energy training clips, dramatic slow-mo shots",
                },
                {
                    "date": "2026-03-10",
                    "platform": "tiktok",
                    "content_type": "short_video",
                    "topic": "History of Demo Brand vs Italian clubs",
                    "caption": "Every time Demo Brand compared to global competitors 🇮🇹⚽ #DemoBrand #History #Football #NewCollection",
                    "hashtags": ["#DemoBrand", "#History", "#SpringCampaign", "#Spring Collection", "#Italian"],
                    "best_time_to_post": "19:00 CET",
                    "visual_direction": "Brand archive footage montage with modern graphics overlay",
                },
                {
                    "date": "2026-03-11",
                    "platform": "instagram",
                    "content_type": "image",
                    "topic": "Matchday graphic - Demo Brand Spring Launch",
                    "caption": "MATCHDAY 🔵⚪ Demo Brand vs AS Roma | Spring Campaign Quarter-Final | 21:00 CET | Flagship Store\n\nWho's coming? 🙋",
                    "hashtags": ["#DemoBrand", "#Spring Collection", "#NewCollection", "#Matchday", "#Zagreb"],
                    "best_time_to_post": "09:00 CET",
                    "visual_direction": "Bold matchday poster with both crests, stadium background, kick-off time",
                },
            ],
            "strategy_notes": (
                "This week's content leans heavily into the Spring Campaign narrative. "
                "The launch event win provides momentum and positive sentiment to carry into global "
                "content. Recommend increasing ad spend on Spring Campaign content by 40% and "
                "targeting international audiences in internationaly and Austria. TikTok content should "
                "prioritize trending audio formats to maximize For You Page reach."
            ),
        }

    async def generate_post_copy(self, brief: dict, client=None) -> dict:
        platform = brief.get("platform", "instagram")
        tone = brief.get("tone", "energetic")
        return {
            "headline": "The road to glory runs through Flagship Store",
            "body": (
                "Launch night at the flagship store. 50,000 customers as one community. "
                "This is what the industry is all about.\n\n"
                "Demo Brand vs Competitor X. Quarter-final. Our house.\n\n"
                "Get your tickets now and be part of history."
            ),
            "call_to_action": "Link in bio for tickets 🏟️",
            "hashtags": ["#DemoBrand", "#SpringCampaign", "#Spring Collection", "#Flagship Store", "#OurHouse"],
            "platform": platform,
            "tone": tone,
            "estimated_engagement": "high - campaign launches content historically performs 2.5x above average",
        }

    async def generate_ab_variants(self, base_copy: str, num_variants: int = 3, client=None) -> list[dict]:
        variants = [
            {
                "variant_id": "var_A",
                "label": "Emotion-driven",
                "copy": "35,000 hearts. One dream. Thursday night, we make history together. Demo Brand Spring Launch - be there.",
                "rationale": "Appeals to collective emotion and shared experience. Uses short, punchy sentences for impact.",
                "predicted_ctr": 3.8,
            },
            {
                "variant_id": "var_B",
                "label": "Urgency-focused",
                "copy": "Tickets are flying. Only 2,400 seats remaining for the biggest launch event in years. Demo Brand Spring Launch, Thursday 21:00. Don't miss out.",
                "rationale": "Creates scarcity and urgency. FOMO-driven approach that works well for event tickets.",
                "predicted_ctr": 4.2,
            },
            {
                "variant_id": "var_C",
                "label": "Stats-powered",
                "copy": "7 wins. 0 defeats at home this season. 22 goals scored at Flagship Store. Thursday we add another chapter. Demo Brand Spring Launch, Spring Campaign QF.",
                "rationale": "Leverages impressive home record statistics to build confidence and excitement.",
                "predicted_ctr": 3.5,
            },
            {
                "variant_id": "var_D",
                "label": "Fan-centric",
                "copy": "YOU made the group stage electric. YOU roared us through the Round of 16. Now we need you one more time. Demo Brand Spring Launch. Our Flagship Store. Our night.",
                "rationale": "Directly addresses fans, making them feel essential to the team's success.",
                "predicted_ctr": 4.0,
            },
        ]
        return variants[:num_variants]

    async def analyze_sentiment(self, texts: list[str], client=None) -> list[dict]:
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

    async def generate_report_summary(self, data: dict, client=None) -> str:
        return (
            "Weekly Performance Summary (Feb 27 - Mar 5, 2026)\n\n"
            "Overall social media performance showed strong growth this week, driven "
            "primarily by launch event-related content. Instagram engagement rate peaked at 4.1% "
            "on matchday (vs. 2.8% weekly average), with the goal highlight reel generating "
            "22,150 likes - the highest-performing post this quarter.\n\n"
            "TikTok continues to be the fastest-growing channel with a 12% follower increase "
            "month-over-month. The 'players pronounce local language words' video went semi-viral "
            "with 3.4M views, demonstrating strong appetite for personality-driven content.\n\n"
            "Website traffic surged 34% on matchday with ticket pages seeing 2.3x normal "
            "traffic. Recommendation: allocate additional budget to retargeting visitors who "
            "viewed ticket pages but did not convert.\n\n"
            "Key Actions:\n"
            "1. Double down on behind-the-scenes and personality content on TikTok\n"
            "2. Increase Spring Campaign ad spend by 40% ahead of Spring Collection quarter-final\n"
            "3. Launch ticket retargeting campaign for unconverted matchday page visitors\n"
            "4. Schedule Instagram carousel recap of launch event within 24 hours of final whistle"
        )

    async def translate_content(
        self, text: str, source_lang: str, target_langs: list[str], client=None
    ) -> dict[str, str]:
        result = {}
        if "en" in target_langs:
            result["en"] = f"[EN] {text[:80]}..."
        if "de" in target_langs:
            result["de"] = f"[DE] {text[:80]}..."
        for lang in target_langs:
            if lang not in result:
                result[lang] = f"[{lang.upper()}] {text[:80]}..."
        return result

    async def generate_strategy_recommendation(self, performance_data: dict, client=None) -> dict:
        return {
            "summary": (
                "Current social strategy is performing above industry benchmarks for sports "
                "organizations. The primary opportunity lies in capitalizing on the Spring Campaign "
                "run to accelerate international audience growth, particularly in international "
                "markets where there is an existing international audience."
            ),
            "strengths": [
                "Instagram engagement rate (2.8%) is 1.4x the brand industry average (2.0%)",
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
                "Spring Campaign QF presents a 2-3 week window for massive international exposure",
                "Player personality content on TikTok has 3x viral potential vs. match content",
                "Merch cross-selling via Instagram Shopping is underutilized",
                "Email list (45K subscribers) is under-leveraged for ticket and merch campaigns",
            ],
            "recommended_actions": [
                {
                    "action": "Launch Spring Campaign content series across all platforms",
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
                    "action": "Create international and English language content variants for key posts",
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
