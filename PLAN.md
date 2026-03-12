# DINAMO MARKETING PLATFORMA — MASTER PLAN
## Datum: 7. Ožujak 2026
## Cilj: Kompletna, funkcionalna platforma u 24 sata

---

## STANJE PROJEKTA — ANALIZA

### Što postoji:
- 18 stranica (Dashboard, Market Research, Channel Audit, Competitors, Fan Insights, Content Calendar, Campaigns, Analytics, Sentiment, Social Listening, Academy, Diaspora, Reports, Settings, Admin, Content Studio, Campaign Research, Login)
- 20 backend routera sa 100+ endpointa
- 10 integracija (Meta, TikTok, YouTube, GA4, Claude, Sports Data, Buffer, Image Gen, Trends, Web Research)
- 13 Celery taskova za automatizaciju
- Mock sustav koji generira realistične podatke
- Docker Compose sa 6 servisa na produkciji (94.72.107.11)

### Što NE radi:
1. **TypeScript greške** — 75 grešaka sprečava čist build
2. **FanInsights nema API** — hardkodirani podaci, nema backend poziva
3. **Fallback vs API** — većina stranica koristi hardkodirane fallback podatke umjesto pravih mock API poziva
4. **Interakcije nedostaju** — mnoge stranice su read-only bez ikakvih akcija
5. **PDF download ne radi** — Reports stranica ima download gumb ali URL ne funkcionira
6. **Content Studio** — AI generiranje ovisi o OpenRouter API ključu
7. **Settings toggleovi** — promjene se ne persistiraju na backend
8. **Export funkcije** — CSV/PDF exporti nisu implementirani
9. **WebSocket** — Dashboard koristi WS ali nije konfiguriran na produkciji
10. **Slike/media** — Image generation vraća placeholder URLove

---

## FAZE IMPLEMENTACIJE

### FAZA 1: KRITIČNI POPRAVCI (0-4 sata)
**Cilj: Platforma se builda i deploya bez grešaka**

#### 1.1 TypeScript Errors Fix
- Fix `reports.ts` env variable (`import.meta.env.VITE_API_URL`)
- Fix `CampaignResearch.tsx` null checks za statusCfg
- Fix `ContentCalendar.tsx` undefined object checks
- Fix `ContentStudio.tsx` post_meta type
- Fix DataTable generičke tipove (Campaigns, Competitors, MarketResearch)
- Ukloniti sve nekorištene importe (30+)
- Fix preostale type mismatch greške

#### 1.2 API Data Flow Fix
- Osigurati da svaka stranica poziva mock API i prikazuje podatke iz njega
- FanInsights — spojiti na /fans/segments, /fans/clv, /fans/churn endpointe
- Provjeriti da svi mock klijenti vraćaju podatke u ispravnom formatu
- Dodati proper error handling na sve stranice

#### 1.3 Build & Deploy
- Pokrenuti `npx vite build` bez grešaka
- Deploy na produkciju
- Verificirati da sve stranice rade

### FAZA 2: FUNKCIONALNOST (4-10 sati)
**Cilj: Sve stranice potpuno funkcionalne s interakcijama**

#### 2.1 Dashboard Improvements
- Fix WebSocket connection za produkciju (fallback na polling)
- Dodati "Zadnjih 7 dana" / "Zadnjih 30 dana" / "Ovaj mjesec" date picker
- Osigurati MetricCard-ovi prikazuju trend ikone (gore/dolje)
- Quick action gumbi: "Kreiraj objavu", "Pokreni kampanju", "Generiraj izvještaj"

#### 2.2 Content Calendar Enhancements
- Drag & drop rescheduling funkcionalan
- "Objavi sada" gumb koji šalje POST na publish endpoint
- Filtriranje po platformi (Instagram, TikTok, Facebook, YouTube)
- Filtriranje po statusu (scheduled, published, draft, failed)
- Klik na post otvara detalje s metrikama

#### 2.3 Content Studio Completion
- AI generiranje sadržaja s mock podacima
- Template galerija s preview-ima
- Media upload s drag & drop
- Export as image/video
- Publish modal sa selekcijom platformi

#### 2.4 Reports Completion
- PDF download koji radi (generira mock PDF)
- Email report gumb
- Usporedba perioda (ovaj tjedan vs prošli)

#### 2.5 Settings Enhancement
- API toggleovi se šalju na backend
- Real-time status check za svaki API
- Brand boje editor
- Notifikacijske preference se persistiraju

#### 2.6 Campaign Management
- "Nova kampanja" wizard (3 koraka: setup, audience, budget)
- A/B test kreiranje
- Campaign metrics detaljna stranica
- Budget allocation vizualizacija

### FAZA 3: PODACI I VIZUALIZACIJE (10-16 sati)
**Cilj: Bogati, realistični mock podaci na svim stranicama**

#### 3.1 Mock Data Enrichment
- Obogatiti Meta mock: dnevni podaci za 90 dana, demografija, top postovi
- Obogatiti TikTok mock: trending zvukovi, hashtag performance
- Obogatiti YouTube mock: video analytics, audience retention
- GA4 mock: full funnel data, UTM tracking, referral sources

#### 3.2 Chart Improvements
- ReachChart: dodati benchmark linije, annotacije za utakmice
- CampaignChart: stacked bar za multi-platform
- FunnelChart: animirani funnel s konverzijskim ratima
- SentimentDonut: timeline trend, word cloud

#### 3.3 Real-time Dashboard
- Polling svake 30 sekundi za nove podatke
- Animated number counters
- Live feed sa najnovijim objavama i reakcijama
- Notification bell s recentnim alertima

#### 3.4 Advanced Analytics
- Heatmap objavljivanja (koji dan/sat ima najbolji engagement)
- Content performance matrica
- ROI kalkulator za kampanje
- Audience overlap analiza

### FAZA 4: KAMPANJA ISTRAŽIVANJE I AI (16-20 sati)
**Cilj: AI pipeline potpuno funkcionalan s mock podacima**

#### 4.1 Campaign Research Enhancement
- Poboljšati mock web research podatke — više izvora, detaljniji snippeti
- Dodati "Usporedi s konkurencijom" feature
- Generirati vizualni plan (timeline, budget pie chart)
- Export plan kao PDF

#### 4.2 AI Content Generation
- Mock AI generiranje postova s Dinamo kontekstom
- Hashtag sugestije bazirane na platformi
- Best time to post preporuke
- A/B copy varijante

#### 4.3 AI Insights
- Automatske preporuke na dashboardu
- Anomaly detection (nagli pad/rast engagement-a)
- Content performance prediction
- Competitor intelligence alerts

### FAZA 5: POLISH I DEPLOY (20-24 sata)
**Cilj: Production-ready, polished platforma**

#### 5.1 UI/UX Polish
- Loading skeleton animacije na svim stranicama
- Smooth page transitions
- Responsive design za tablet (768px)
- Empty states s ilustracijama i CTA gumbima
- Toast notifikacije za uspjeh/grešku

#### 5.2 Performance
- Lazy loading svih stranica (vec implementirano)
- Image optimizacija
- API response caching na frontendu
- Bundle size optimizacija

#### 5.3 Final Deploy
- Build bez grešaka
- Deploy na produkciju
- Clear service worker cache
- Smoke test svih 18 stranica
- Verificirati u browseru

---

## PRIORITETNI REDOSLIJED

### ODMAH (Kritično):
1. Fix TypeScript grešaka → build radi
2. FanInsights API integracija
3. Deploy i verificirati

### DANAS (Važno):
4. Dashboard date picker + quick actions
5. Content Calendar filteri + publish
6. Reports PDF download
7. Settings API toggle persistence
8. Campaign wizard

### SUTRA (Poboljšanja):
9. Mock data enrichment
10. Chart improvements
11. AI pipeline enhancement
12. UI/UX polish

---

## TEHNIČKI DETALJI

### Frontend Stack:
- React 18 + TypeScript + Vite 6
- Tailwind CSS za styling
- Recharts za grafove
- dnd-kit za drag & drop
- Lucide React za ikone
- Axios za API pozive

### Backend Stack:
- FastAPI + Uvicorn
- SQLAlchemy 2 async + Alembic
- Celery 5 + Redis 7
- PostgreSQL 16
- httpx za external API pozive

### Deployment:
- Docker Compose na VPS (94.72.107.11)
- Nginx reverse proxy
- Let's Encrypt SSL
- Cloudflare DNS

### API Endpoints: 100+
### Database Tables: 25+
### Celery Tasks: 13
### Mock Integrations: 10

---

## METRKE USPJEHA

1. ✅ Build bez TypeScript grešaka
2. ✅ Svih 18 stranica učitava podatke iz API-ja
3. ✅ Interakcije rade (publish, pause, generate, download)
4. ✅ Produkcija dostupna na dinamo.xyler.ai
5. ✅ Responsive na desktopu (1280px+)
6. ✅ Login → Dashboard → sve stranice bez grešaka

---

**POČETAK: ODMAH**
**PRIORITET: FAZA 1 — FIX BUILD, FIX DATA, DEPLOY**
