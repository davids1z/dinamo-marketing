# ShiftOneZero — Agent Team Task Board
# Updated: 2026-03-16 | Coordinator: Claude Lead

## 🔴 CRITICAL (P0)
- [ ] Campaigns page: ALL metrics show 0 — backend not returning real data
- [ ] ChannelAudit: missing fields (aiAdvice, checklist, overallScore, postingTimes)
- [ ] WebSocket /ws endpoint: NOT scoping to client_id (data leak)

## 🟡 HIGH (P1)  
- [ ] Geography page: empty map — needs react-simple-maps heatmap
- [ ] Dashboard: some KPI cards still show 0 when data exists in DB
- [ ] Partners page: KPI cards at top always 0, no AI match score

## 🟢 MEDIUM (P2)
- [ ] Campaign Research: "Prebaci u Kalendar" button does nothing
- [ ] Reports: PDF generation not implemented
- [ ] Settings: AI generation quota display (show "15/50 used" instead of ∞)

## ✅ COMPLETED THIS SESSION
- [x] Seed Scaler (brand size proportional mock data)
- [x] PostMetric timestamps spread across 30 days
- [x] refreshSignal cross-page cache bust
- [x] Beta/Sandbox badges on integrations
- [x] ContentCalendar profile completeness guard
- [x] Competitor SWOT AI analysis
- [x] Brand Profile overhaul (sticky save, tone chips, logo upload)

## AGENT STATUS
- Agent-Campaigns: 🔄 Working on Campaigns BFF + metrics
- Agent-ChannelAudit: 🔄 Working on audit backend fields
- Agent-Geography: 🔄 Working on react-simple-maps
- Agent-Dashboard: 🔄 Working on Dashboard data flow
- Agent-Partners: 🔄 Working on Partners AI match score
- Agent-QA: ⏳ Waiting to run TypeScript checks
