# ShiftOneZero — Agent Team Task Board
# Updated: 2026-03-16 | Session 2 COMPLETE ✅

## 🔴 CRITICAL (P0) — ALL FIXED ✅
- [x] Campaigns page: Real SQL aggregation (SUM from ad_metrics) + campaign seed (Step G)
- [x] ChannelAudit: Added 5 missing fields (aiAdvice, checklist, overallScore, postingTimes, industryComparison)
- [x] WebSocket /ws/live: Scoped to client_id — JWT auth gate before accept(), data leak closed

## 🟡 HIGH (P1) — ALL FIXED ✅
- [x] Geography page: WorldChoroplethMap (react-simple-maps + d3, #1c2a18 → #B8FF00 gradient)
- [x] Dashboard: total_followers from ChannelMetric, KPI period filtering, chart no longer capped at 7 days
- [x] Partners page: Built from scratch — model + migration + router + full UI with AI match score (0-100)

## 🟢 MEDIUM (P2) — ALL FIXED ✅
- [x] Campaign Research: "Prebaci u Kalendar" creates real ContentPost draft + toast with nav link
- [x] Reports: PDF export via printReportPdf.ts (A4 brand layout, browser print, iframe fallback)
- [x] Settings: AI quota shows real "{used}/{total}" + color-coded progress bar + reset date

## 🎨 BRAND PROFILE OVERHAUL — COMPLETE ✅
- [x] Sticky Save bar (dirty-state tracking, slide-up animation, Odbaci/Spremi)
- [x] Tone chips — interactive cards with emoji + description (grid-cols-1 sm:grid-cols-2)
- [x] Logo Upload (drag-and-drop UI, POST /{client_id}/logo backend, /media proxy)
- [x] Social link validation (URL check, red/green border feedback)
- [x] ContentCalendar profile completeness guard (useProfileCompleteness hook)

## ✅ COMPLETED THIS SESSION (Wave 1 + Wave 2 + Wave 3)
- [x] WebSocket security fix (client_id scoping + JWT auth gate)
- [x] Campaigns BFF — real SQL metrics + Step G seed (campaigns/adsets/ads/ad_metrics)
- [x] ChannelAudit — 5 missing fields via pure Python heuristics (no AI calls)
- [x] Geography — WorldChoroplethMap (react-simple-maps + d3-scale + ISO lookup)
- [x] Dashboard — ChannelMetric follower query, period filtering, chart cap removed
- [x] Partners — full page from scratch (model + Alembic migration + router + UI + match score)
- [x] CampaignResearch — "Prebaci u Kalendar" functional (POST /content/posts)
- [x] Reports — PDF export (printReportPdf.ts, A4, brand header, KPI grid, data table)
- [x] Settings — AI quota display (GET /settings/ai-quota, color-coded progress bar)
- [x] BrandProfile — tone chips updated + social URL validation edge case fixed
- [x] Final QA — 0 TypeScript errors, Vite build clean, 20/20 Python files syntax OK

## ✅ COMPLETED PREVIOUS SESSIONS
- [x] Seed Scaler (brand size proportional mock data)
- [x] PostMetric timestamps spread across 30 days
- [x] refreshSignal cross-page cache bust
- [x] Beta/Sandbox badges on integrations
- [x] ContentCalendar profile completeness guard
- [x] Competitor SWOT AI analysis
- [x] Brand Profile overhaul (sticky save, tone chips, logo upload)

## 🚀 NEXT WAVE IDEAS
- [ ] Real-time notifications (in-app bell, unread count badge)
- [ ] Bulk content scheduling (multi-select posts, batch date picker)
- [ ] AI image generation per post (placeholder → real gen)
- [ ] Multi-language content (HR/EN/DE toggle per post)
- [ ] A/B test winner UI (clear winner highlight on Campaigns page)
- [ ] CSV export (Analytics, Campaigns, Partners)
- [ ] Onboarding tour (guided first-login walkthrough)

## QUALITY GATES — ALL GREEN ✅
- TypeScript: ✅ 0 errors
- Vite build: ✅ Clean (3.38s, 29 chunks)
- Python syntax: ✅ 20/20 files OK
- Production: ✅ Live at shiftonezero.xyler.ai (all 4 containers healthy)
- DB migration: ✅ j1g7i9h20e47 (Partners table applied)
