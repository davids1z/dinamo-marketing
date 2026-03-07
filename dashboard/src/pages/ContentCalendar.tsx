import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import PlatformIcon from '../components/common/PlatformIcon'
import { contentApi } from '../api/content'
import {
  Calendar, ChevronLeft, ChevronRight, Check, X, Clock, Sparkles,
  Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp, TrendingDown,
  LayoutGrid, List, CalendarDays, Loader2, BarChart3, Target, Zap,
  Film, Filter, Send, Instagram, Facebook, Youtube, Music2,
} from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useAuth } from '../contexts/AuthContext'

const DAYS_OF_WEEK = ['Pon', 'Uto', 'Sri', 'Cet', 'Pet', 'Sub', 'Ned']

interface PostMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagement_rate: number
  reach: number
  impressions: number
  prev_week_avg_views: number
  prev_week_avg_engagement: number
}

interface Post {
  id: string
  platform: string
  type: string
  title: string
  description: string
  caption_hr: string
  scheduled_time: string
  content_pillar: string
  hashtags: string[]
  visual_brief: string
  visual_url?: string
  status: 'published' | 'scheduled' | 'draft' | 'missed' | 'approved' | 'failed'
  metrics?: PostMetrics
  platform_post_url?: string
  publish_error?: string
}

interface QueueItem {
  id: string
  title: string
  platform: string
  author: string
  submitted: string
  pillar: string
}

type PlatformFilter = 'all' | 'instagram' | 'facebook' | 'tiktok' | 'youtube'
type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published'
type TypeFilter = 'all' | 'reel' | 'story' | 'post' | 'video'

const PLATFORM_FILTER_OPTIONS: { value: PlatformFilter; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'tiktok', label: 'TikTok', icon: Music2 },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
]

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'Sve', color: 'bg-gray-100 text-gray-700' },
  { value: 'draft', label: 'Draft', color: 'bg-yellow-50 text-yellow-700' },
  { value: 'scheduled', label: 'Zakazano', color: 'bg-blue-50 text-blue-700' },
  { value: 'published', label: 'Objavljeno', color: 'bg-green-50 text-green-700' },
]

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'post', label: 'Post' },
  { value: 'video', label: 'Video' },
]

const statusDotColors: Record<string, string> = {
  published: 'bg-green-500',
  scheduled: 'bg-blue-500',
  draft: 'bg-yellow-500',
  approved: 'bg-emerald-500',
  missed: 'bg-red-500',
  failed: 'bg-red-500',
}

// Rich fallback data for March 2026
// Convert short mock ID (e.g. '7a') to a valid UUID for API compatibility
function mockUUID(short: string): string {
  return `00000000-0000-4000-a000-${short.padStart(12, '0')}`
}

function generateFallbackData(): Record<number, Post[]> {
  const data: Record<number, Post[]> = {}

  const published = (id: string, platform: string, type: string, title: string, desc: string, caption: string, time: string, pillar: string, hashtags: string[], visual: string, metrics: PostMetrics): Post => ({
    id: mockUUID(id), platform, type, title, description: desc, caption_hr: caption, scheduled_time: time, content_pillar: pillar, hashtags, visual_brief: visual, status: 'published', metrics,
  })

  const scheduled = (id: string, platform: string, type: string, title: string, desc: string, caption: string, time: string, pillar: string, hashtags: string[], visual: string): Post => ({
    id: mockUUID(id), platform, type, title, description: desc, caption_hr: caption, scheduled_time: time, content_pillar: pillar, hashtags, visual_brief: visual, status: 'scheduled',
  })

  // Day 1 - Sunday (past)
  data[1] = [
    published('1a', 'instagram', 'reel', 'Nedjeljna regeneracija', 'Igraci na laganom treningu nakon pobjede u HNL-u. Opustena atmosfera, smijeh i timski duh.', 'Nedjelja = regeneracija! 💪 Tijelo odmara, ali duh je uvijek spreman. #Dinamo #Modri #HNL', '10:00', 'behind_scenes', ['#Dinamo', '#Modri', '#Trening', '#HNL'], 'Slow-motion kadrovi igrača na treningu, plavi filter, opustena glazba', { views: 45200, likes: 3820, comments: 187, shares: 412, saves: 298, engagement_rate: 4.2, reach: 89400, impressions: 112000, prev_week_avg_views: 38000, prev_week_avg_engagement: 3.8 }),
    published('1b', 'facebook', 'post', 'Rezultati omladinskog kupa', 'U19 reprezentacija pobijedila u polufinalu omladinskog kupa. Detaljan izvjestaj s utakmice.', '⚽ U19 u finalu! Nasa mladost, nasa buducnost. Cestitamo nasim mladim lavovima! 🦁🔵 #DinamoAkademija', '14:00', 'academy', ['#Dinamo', '#Akademija', '#U19', '#Buducnost'], 'Fotografija U19 tima sa slavljem, grb kluba u kutu', { views: 12800, likes: 1540, comments: 89, shares: 234, saves: 45, engagement_rate: 3.1, reach: 42000, impressions: 58000, prev_week_avg_views: 11000, prev_week_avg_engagement: 2.8 }),
    published('1c', 'tiktok', 'video', 'Tko je najbrzi? Challenge', 'Sprint challenge izmedju trojice igrača na treningu. Zabavan sadržaj za mlade navijace.', 'Tko je NAJBRŽI u Dinamu?! 🏃‍♂️💨 Pogledajte i dajte svoj glas! #Dinamo #Challenge #Brzi', '18:00', 'player_spotlight', ['#Dinamo', '#Challenge', '#Nogomet', '#HNL', '#FYP'], 'Vertikalni format, split screen utrka, timer overlay, energicna glazba', { views: 128000, likes: 14200, comments: 892, shares: 3400, saves: 1200, engagement_rate: 7.8, reach: 245000, impressions: 310000, prev_week_avg_views: 95000, prev_week_avg_engagement: 6.2 }),
  ]

  // Day 2 - Monday (past)
  data[2] = [
    published('2a', 'instagram', 'carousel', 'Igrač tjedna: Petković', 'Statistike, highlights i osobna prica o najboljem igraču proslog tjedna.', 'Bruno Petković — nas br. 9 je opet pokazao klasu! 🔥 Hat-trick heroj. Swipe za sve statse ➡️ #Dinamo #Petković #HNL', '12:00', 'player_spotlight', ['#Dinamo', '#Petković', '#IgračTjedna', '#HNL'], '5-slide carousel: slide 1 akcijska fotka, slide 2-4 statistike na plavoj pozadini, slide 5 quote igrača', { views: 67800, likes: 8920, comments: 456, shares: 1230, saves: 890, engagement_rate: 5.8, reach: 134000, impressions: 178000, prev_week_avg_views: 52000, prev_week_avg_engagement: 4.9 }),
    published('2b', 'youtube', 'video', 'Analiza: Dinamo 3-0 Rijeka', 'Detaljni pregled utakmice s taktičkom analizom, najboljim akcijama i statistikama.', 'ANALIZA: Dinamo 3-0 Rijeka | Sve o utakmici, taktici i najboljim trenutcima! ⚽🔵', '17:00', 'match_day', ['#Dinamo', '#HNL', '#DinamoRijeka', '#Analiza'], 'YouTube thumbnail: akcijska fotka s rezultatom 3-0, plavi okvir, strelice na taktičkoj tabli', { views: 34500, likes: 2100, comments: 312, shares: 456, saves: 678, engagement_rate: 4.1, reach: 56000, impressions: 72000, prev_week_avg_views: 28000, prev_week_avg_engagement: 3.7 }),
  ]

  // Day 3 - Tuesday (past)
  data[3] = [
    published('3a', 'instagram', 'story', 'Trening u Maksimiru', 'Behind the scenes s jucarnjeg treninga. Stories serija od 5 frame-ova.', 'Jutarnji trening ✅ Spremi se za srijedu! 🔵', '09:00', 'behind_scenes', ['#Dinamo', '#Trening'], 'Story format: video snippets iz treninga, poll "Tko ce zabiti u srijedu?"', { views: 32000, likes: 2100, comments: 0, shares: 180, saves: 0, engagement_rate: 3.4, reach: 54000, impressions: 68000, prev_week_avg_views: 28000, prev_week_avg_engagement: 3.1 }),
    published('3b', 'tiktok', 'video', 'Reakcija navijača na golove', 'Kompilacija reakcija navijača na Petkovićev hat-trick. Emotivni trenutci s tribina.', 'Reakcije navijača na HAT-TRICK! 😱🔥 Ovo je Maksimir! #Dinamo #Navijaci #HatTrick #BBB', '20:00', 'fan_engagement', ['#Dinamo', '#BBB', '#Navijaci', '#HatTrick', '#FYP'], 'Brzi rezovi reakcija s tribina, usporeni kadrovi, epska pozadinska glazba', { views: 198000, likes: 24500, comments: 1340, shares: 8900, saves: 2100, engagement_rate: 9.2, reach: 380000, impressions: 456000, prev_week_avg_views: 95000, prev_week_avg_engagement: 6.2 }),
  ]

  // Day 4 - Wednesday (past) - European night!
  data[4] = [
    published('4a', 'instagram', 'carousel', 'Matchday: Europa League', 'Dan utakmice! Dinamo vs AS Roma, Europa League cetvrtfinale. Najava s grafickim dizajnom.', '🏟️ MATCHDAY! Dinamo vs AS Roma | UEL Quarter-Final 🔵⚡ Spremni za europsku noc! #UEL #Dinamo', '09:00', 'european_nights', ['#Dinamo', '#UEL', '#EuropaLeague', '#DinamoRoma', '#Modri'], 'Matchday poster: stadion Maksimir, grb vs grb, datum i vrijeme, europska noc atmosfera', { views: 89000, likes: 12400, comments: 1890, shares: 4500, saves: 1200, engagement_rate: 8.1, reach: 210000, impressions: 280000, prev_week_avg_views: 52000, prev_week_avg_engagement: 4.9 }),
    published('4b', 'tiktok', 'video', 'Tunnel cam: Dolazak igrača', 'Igraci dolaze na stadion za europsku utakmicu. Svaki igračsa svojim stilom.', '🚶‍♂️ Arrival day. Svaki od njih zna sto treba napraviti. #Dinamo #UEL #MatchDay #Tunnel', '17:00', 'european_nights', ['#Dinamo', '#UEL', '#MatchDay', '#Tunnel', '#FYP'], 'Slo-mo igračkih dolazaka, kožne jakne, slušalice, fokusirani pogledi, dramska muzika', { views: 156000, likes: 18900, comments: 2100, shares: 6700, saves: 3400, engagement_rate: 8.9, reach: 298000, impressions: 380000, prev_week_avg_views: 95000, prev_week_avg_engagement: 6.2 }),
    published('4c', 'youtube', 'video', 'HIGHLIGHTS: Dinamo vs Roma', 'Produzeni highlights europske utakmice. Svi golovi i najbolje akcije.', 'HIGHLIGHTS | Dinamo Zagreb vs AS Roma | UEL Quarter-Final ⚽', '23:00', 'european_nights', ['#Dinamo', '#UEL', '#Highlights', '#DinamoRoma'], 'Full HD highlights, 10-minutni video, svi golovi iz vise kutova, atmosfera s tribina', { views: 412000, likes: 28400, comments: 3450, shares: 12300, saves: 8900, engagement_rate: 6.8, reach: 680000, impressions: 890000, prev_week_avg_views: 28000, prev_week_avg_engagement: 3.7 }),
    published('4d', 'facebook', 'post', 'FT: Dinamo 2-1 Roma!', 'Rezultat i kratki pregled utakmice za Facebook zajednicu.', '⚽ POBJEDA! 🔵 Dinamo 2-1 AS Roma! Europska noc za pamcenje! 🏟️🇭🇷 #Dinamo #UEL', '22:30', 'european_nights', ['#Dinamo', '#UEL', '#Pobjeda'], 'Rezultatska grafika, slavlje igrača, plave boje', { views: 78000, likes: 9800, comments: 2340, shares: 5600, saves: 890, engagement_rate: 7.2, reach: 145000, impressions: 198000, prev_week_avg_views: 11000, prev_week_avg_engagement: 2.8 }),
  ]

  // Day 5 - Thursday (today) - post-match
  data[5] = [
    published('5a', 'instagram', 'reel', 'Best moments: Dinamo vs Roma', 'Najbolji trenuci europske noci u 30 sekundi. Emotivni video za IG.', '🎬 Europska noć. Maksimir. Pobjeda. 🔵⚡ Ovo su trenuci za koje živimo! #Dinamo #UEL #Modri', '10:00', 'european_nights', ['#Dinamo', '#UEL', '#BestMoments', '#Modri'], '30s reel: najljepsi trenuci iz utakmice, spora snimka golova, navijacko slavlje', { views: 234000, likes: 31200, comments: 2890, shares: 9800, saves: 5600, engagement_rate: 9.4, reach: 420000, impressions: 540000, prev_week_avg_views: 38000, prev_week_avg_engagement: 3.8 }),
    scheduled('5b', 'tiktok', 'video', 'Petković gol reakcija', 'Slow motion Petkovićev gol iz svih kuteva kamere + reakcija klupe i navijača.', '🎯 PETKOVIĆ! Pogledajte ovaj gol iz SVIH kutova! 😱🔥 #Dinamo #Gol #Petković #UEL', '17:00', 'european_nights', ['#Dinamo', '#Petković', '#Gol', '#UEL', '#FYP'], 'Multi-angle replay, slow motion, reakcija klupe, zvuk gola + navijača'),
    scheduled('5c', 'youtube', 'short', 'Press konferencija highlights', 'Najbolji trenuci s press konferencije nakon utakmice. Trenerov komentar.', 'Trener nakon pobjede nad Romom: "Ovo je samo početak!" 🎙️ #Dinamo #UEL', '20:00', 'european_nights', ['#Dinamo', '#UEL', '#Press', '#Trener'], 'Vertikalni crop press konferencije, titlovi na hrvatskom, plavi overlay'),
  ]

  // Days 6-31 - Future days with scheduled content
  const futureContent: [number, Post[]][] = [
    [6, [
      scheduled('6a', 'instagram', 'carousel', 'UEL statistike', 'Infografika s detaljnim statistikama utakmice protiv Rome. Posjed, udarci, prilike.', '📊 Brojke govore same za sebe! Dinamo vs Roma u statistikama ➡️ #Dinamo #UEL #Stats', '12:00', 'european_nights', ['#Dinamo', '#UEL', '#Statistike'], 'Statistički carousel: 5 slajdova s grafovima i brojevima, plava/bijela tema'),
      scheduled('6b', 'facebook', 'post', 'Fan foto galerija', 'Najbolje fotografije navijača s europske noci. UGC sadržaj s tribina Maksimira.', '📸 Vaše fotke s Maksimira! Hvala vam na nevjerojatnoj atmosferi! Tagajte se! 🔵🏟️ #BBB #Dinamo', '18:00', 'fan_engagement', ['#Dinamo', '#BBB', '#Navijaci', '#Maksimir'], 'Kolaž navijačkih fotografija, poziv na tagging, plavi okvir'),
    ]],
    [7, [
      scheduled('7a', 'instagram', 'reel', 'Subotnja najava: HNL', 'Matchday najava za subotnju HNL utakmicu. Hype video s najavaom protivnika.', '🏟️ Subota. HNL. Mi smo spremni, a vi? 🔵⚡ #Dinamo #HNL #Matchday', '09:00', 'match_day', ['#Dinamo', '#HNL', '#Matchday', '#Modri'], 'Kratki hype video: stadion, igraci, navijaci, tekst "SUBOTA 17:30"'),
      scheduled('7b', 'tiktok', 'video', 'Igrač priprema opremu', 'POV video igrača koji sprema opremu za utakmicu. Kopačke, dresovi, rutina.', 'POV: Pripremaš se za HNL utakmicu 👟⚽ #Dinamo #MatchPrep #Football #POV', '13:00', 'behind_scenes', ['#Dinamo', '#POV', '#Football', '#BTS'], 'POV kamera, close-up cipela, dresova, torbice, stadion u pozadini'),
      scheduled('7c', 'youtube', 'video', 'Taktički preview', 'Analitičar kluba objašnjava taktički pristup za subotnju utakmicu. Formacija, ključni igraci.', '🎯 TAKTIKA | Kako ćemo pristupiti subotnjoj utakmici? | Preview', '17:00', 'match_day', ['#Dinamo', '#Taktika', '#HNL', '#Preview'], 'Studio setup, taktička tabla, animirane formacije, split screen s isječcima'),
    ]],
    [8, [
      scheduled('8a', 'instagram', 'story', 'Matchday countdown', 'Story serija s countdownom do utakmice. Interaktivni stickeri i ankete.', '⏰ Još 5 sati! Tko ce zabiti prvi? Glasajte! 🔵', '12:00', 'match_day', ['#Dinamo', '#HNL'], 'Story s countdown stickerom, poll za prvog strijelca, quiz'),
      scheduled('8b', 'instagram', 'reel', 'Gol kompilacija sezone', 'Svi golovi Dinama ove sezone u jednom reelu. Epska montaza.', '⚽ SVAKI GOL ove sezone u 60 sekundi! 🔥🔵 Koji vam je najljepši? #Dinamo #Golovi #HNL', '20:00', 'match_day', ['#Dinamo', '#Golovi', '#HNL', '#Sezona'], '60s reel: brzi rezovi svih golova, brojač u kutu, energična glazba'),
      scheduled('8c', 'facebook', 'event', 'Gledanje utakmice — Zagreb', 'Organizirano zajedničko gledanje utakmice u centru Zagreba za navijače.', '📺 ZAJEDNO GLEDAMO! Pridružite nam se u Saturday Beer Gardenu! 🍻🔵 #Dinamo #Zajedno', '10:00', 'fan_engagement', ['#Dinamo', '#ZajednoGledamo', '#Zagreb'], 'Event poster s lokacijom, vremenom, logom kluba'),
    ]],
    [9, [
      scheduled('9a', 'instagram', 'carousel', 'Rezultat + highlights', 'Post-match carousel s rezultatom, najboljim trenucima i statistikama.', '✅ Još jedna pobjeda! Pogledajte highlights ➡️ #Dinamo #HNL #Pobjeda', '11:00', 'match_day', ['#Dinamo', '#HNL', '#Highlights'], '4-slide carousel: rezultat, best moments, statistike, sljedeca utakmica'),
      scheduled('9b', 'tiktok', 'video', 'Fan reakcije na pobjedu', 'Kompilacija reakcija navijača iz cijele Hrvatske na golove Dinama.', '📱 Reakcije navijača na pobjedu! 😂🔥 Ovo je ljubav prema klubu! #Dinamo #Reakcije #FYP', '18:00', 'fan_engagement', ['#Dinamo', '#Reakcije', '#FYP', '#BBB'], 'Split screen reakcija, glasne navijačke reakcije, sretni trenuci'),
    ]],
    [10, [
      scheduled('10a', 'instagram', 'reel', 'Trening freestyle', 'Igraci pokazuju freestyle trikove na treningu. Zabavan, viralan sadržaj.', '🤹‍♂️ Freestyle na treningu! Tko je najbolji? 😂⚽ #Dinamo #Freestyle #Nogomet', '12:00', 'player_spotlight', ['#Dinamo', '#Freestyle', '#Trikovi'], 'Vertikalni format, slow motion trikovi, natjecanje izmedju igrača'),
      scheduled('10b', 'youtube', 'short', 'Akademija: Talent u fokusu', 'Profil mladog igrača iz akademije. Njegov put, snovi i ambicije.', '⭐ BUDUĆNOST je ovdje! Upoznajte našeg mladog talenta! #DinamoAkademija', '17:00', 'academy', ['#Dinamo', '#Akademija', '#MladiTalent'], 'Intervju format, trening kadrovi, statistike talenta'),
    ]],
    [11, [
      scheduled('11a', 'tiktok', 'video', 'Dan u zivotu: Kondicijski trener', 'Prateći kondicijskog trenera kroz radni dan. Od jutra do zadnjeg treninga.', '5:30 buđenje, 22:00 zavrsava trening... Dan u životu kondicijskog trenera 💪 #Dinamo #Fitness #DanUŽivotu', '09:00', 'behind_scenes', ['#Dinamo', '#DanUŽivotu', '#Fitness', '#FYP'], 'Vlog stil, time-lapse priprema, intenzivni treninzi, zavrsni shot s igracima'),
      scheduled('11b', 'instagram', 'post', 'Motivacijski citat', 'Citat trenera ili igrača na inspirativnoj pozadini stadiona.', '"Svaka utakmica je prilika da se pokažemo." — Trener 🔵💪 #Dinamo #Motivacija', '20:00', 'lifestyle', ['#Dinamo', '#Motivacija', '#Citat'], 'Tipografija na slici stadiona, plavi gradient, minimalistički dizajn'),
    ]],
    [12, [
      scheduled('12a', 'instagram', 'reel', 'Kit reveal: Gostujući dres', 'Otkrivanje novog gostujućeg dresa za sezonu 2026/27. Teaser video.', '👀 Nešto novo dolazi... 🔵⚪ Jeste li spremni? #Dinamo #NoviDres #2027', '18:00', 'lifestyle', ['#Dinamo', '#NoviDres', '#Kit', '#Reveal'], 'Teaser: zamucena slika dresa, ruke koje odmotavaju, dramska pauza, reveal'),
      scheduled('12b', 'facebook', 'post', '#OnThisDay: Povijesna pobjeda', 'Throwback na povijesnu pobjedu Dinama na danasnji datum. Nostalgicni sadržaj.', '📅 #OnThisDay | Na današnji dan Dinamo je... 🔵🏆 Sjećate li se? #Dinamo #Povijest', '14:00', 'fan_engagement', ['#Dinamo', '#OnThisDay', '#Povijest'], 'Stara fotografija/video s modernim overlay-em, datum i rezultat'),
    ]],
    [13, [
      scheduled('13a', 'tiktok', 'video', 'Što igrači jedu', 'Nutricionistički plan igrača. Sto je na tanjuru profesionalnog nogometaša.', '🍽️ Što jede profesionalni nogometaš? Pogledajte jelovnik nasih igrača! #Dinamo #Hrana #Nogomet', '12:00', 'behind_scenes', ['#Dinamo', '#Hrana', '#Nutrition', '#FYP'], 'Close-up hrane, boja, nutritivne vrijednosti overlay, igrač objašnjava'),
      scheduled('13b', 'instagram', 'story', 'Kviz: Poznajes li Dinamo?', 'Interaktivni kviz u Stories formatu o povijesti i igracima kluba.', 'Koliko ZAISTA znaš o Dinamu? 🧠🔵 Testiraj se! #DinamoKviz', '17:00', 'fan_engagement', ['#Dinamo', '#Kviz'], 'Quiz stickeri, 5 pitanja o klubu, rezultati na kraju'),
    ]],
    [14, [
      scheduled('14a', 'instagram', 'carousel', 'Top 5 golova mjeseca', 'Carousel s 5 najljepsih golova Dinama ovog mjeseca. Glasanje u komentarima.', '🏆 TOP 5 golova ožujka! Koji je vaš br. 1? Glasajte u komentarima! ⬇️ #Dinamo #Golovi', '12:00', 'match_day', ['#Dinamo', '#Top5', '#Golovi', '#Ozujak'], '5-slide carousel: svaki slajd jedan gol s brojem i kratkim opisom'),
      scheduled('14b', 'tiktok', 'video', 'Igrač vs navijač: Penalty challenge', 'Igrač Dinama protiv navijača u penalty izazovu. Zabavan interaktivni sadržaj.', '⚽ PENALTY CHALLENGE! Igrač vs Navijač! Tko pobjeđuje? 😂 #Dinamo #Challenge #Penalty', '18:00', 'fan_engagement', ['#Dinamo', '#PenaltyChallenge', '#FYP'], 'Split screen, reakcije, polagani replay, zabavan komentar'),
      scheduled('14c', 'youtube', 'video', 'Subotnja najava + preview', 'Detaljan preview subotnje HNL utakmice. Forma, statistike, kljucni igraci.', '🎯 PREVIEW | Sve sto trebate znati prije subotnje utakmice! ⚽🔵', '17:00', 'match_day', ['#Dinamo', '#HNL', '#Preview'], 'Studijski format, grafike statistika, isjecci s proslih utakmica'),
    ]],
    [15, [
      scheduled('15a', 'instagram', 'reel', 'Matchday hype', 'Epski hype video za sutrašnju utakmicu. Igraci, navijaci, stadion.', '🔥 SUTRA. MAKSIMIR. HNL. Budite glasni! 🏟️🔵 #Dinamo #Matchday #HNL', '20:00', 'match_day', ['#Dinamo', '#HNL', '#Matchday', '#Hype'], 'Cinematic slow-mo: igraci ulaze na teren, tribine pune, baklje, zvuk navijača'),
      scheduled('15b', 'facebook', 'event', 'HNL: Dinamo vs Osijek', 'Event za sutrašnju utakmicu. Informacije o kartama, prijevozu i atmosferi.', '🎫 HNL | Dinamo vs Osijek | Subota 17:30 | Maksimir 🏟️ Vidimo se! #Dinamo', '10:00', 'match_day', ['#Dinamo', '#HNL', '#DinamoOsijek'], 'Event cover s matchday grafikom, info o kartama'),
    ]],
    [16, [
      scheduled('16a', 'instagram', 'reel', 'Post-match celebration', 'Slavlje nakon pobjede. Igraci s navijacima, zagrljaji, veselje.', '🎉 TRI BODA! Slavlje s navijačima! 🔵💙 #Dinamo #Pobjeda #HNL', '20:00', 'match_day', ['#Dinamo', '#Pobjeda', '#Slavlje'], 'Emotivni kadrovi slavlja, igraci trcati prema tribinama, zagrljaji'),
      scheduled('16b', 'tiktok', 'video', 'Locker room vibes', 'Atmosfera u svlacionici nakon pobjede. Muzika, ples, slavlje.', '🎵 Svlačionica AFTER pobjede! Vibes su na drugom nivou! 🔵🕺 #Dinamo #LockerRoom #FYP', '22:00', 'behind_scenes', ['#Dinamo', '#LockerRoom', '#Vibes', '#FYP'], 'Handheld kamera, glazba, igraci plešu, spontani trenuci'),
    ]],
    [17, [
      scheduled('17a', 'youtube', 'video', 'Extended highlights', 'Produzeni highlights utakmice. 10 minuta najboljih akcija.', 'HIGHLIGHTS | Dinamo vs Osijek | HNL 2025/26 ⚽', '11:00', 'match_day', ['#Dinamo', '#HNL', '#Highlights'], 'Full HD highlights, vise kutova, atmosfera, komentator'),
      scheduled('17b', 'instagram', 'carousel', 'Player ratings', 'Ocjene igrača nakon utakmice s kratkim komentarima za svakog.', '📊 Ocjene igrača! Slažete li se? Koji igrač zaslužuje 10? ⬇️ #Dinamo #Ocjene', '15:00', 'match_day', ['#Dinamo', '#Ocjene', '#HNL'], 'Carousel: svaki igrač s ocjenom i kratkim opisom, plava tema'),
    ]],
    [18, [
      scheduled('18a', 'tiktok', 'video', 'Dijaspora event: Beč', 'Najava gledanja utakmice za dijasporu u Becu. Community building.', '🇦🇹 DINAMO u Beču! Pridružite nam se na zajedničkom gledanju! 🔵 #Dinamo #Dijaspora #Wien', '12:00', 'diaspora', ['#Dinamo', '#Dijaspora', '#Wien', '#Bec'], 'Video poziv, lokacija u Beču, zajedničko gledanje, zastave'),
      scheduled('18b', 'instagram', 'post', 'Merch drop: Nova kolekcija', 'Najava nove kolekcije merchandise-a. Lifestyle fotografije s igracima.', '🛍️ NOVO u shopu! Lifestyle kolekcija 2026 🔵 Link u bio! #Dinamo #Merch #Moda', '18:00', 'lifestyle', ['#Dinamo', '#Merch', '#Shop', '#Lifestyle'], 'Lifestyle fotografije, igraci u casual odjevnim kombinacijama, gradski Zagreb'),
    ]],
    [19, [
      scheduled('19a', 'instagram', 'reel', 'Training drills montage', 'Montaza najintenzivnijih vježbi s treninga. Pokazuje radnu etiku tima.', '💪 Ovo je razina. Ovo je Dinamo. Trening bez kompromisa. 🔵🔥 #Dinamo #Trening #WorkHard', '10:00', 'behind_scenes', ['#Dinamo', '#Trening', '#NikadiNe', '#Rad'], 'Brza montaza: sprint, udarci, obrana, znoj, fokusirani pogledi'),
      scheduled('19b', 'facebook', 'post', 'Navijacka anketa', 'Anketa za navijace: Tko je MVP sezone? Online glasanje s rezultatima.', '🏆 TKO je MVP sezone? 🤔 Glasajte SADA! ⬇️ #Dinamo #MVP #Glasanje', '17:00', 'fan_engagement', ['#Dinamo', '#MVP', '#Anketa'], 'Grafika s 4 kandidata, glasacki gumbi, poziv na interakciju'),
    ]],
    [20, [
      scheduled('20a', 'instagram', 'carousel', 'Zagreb x Dinamo', 'Foto serija: igraci na ikonicnim lokacijama u Zagrebu. Lifestyle sadržaj.', '🏙️ Zagreb 🤝 Dinamo | Grad i klub, nerazdvojni! 📸 #Dinamo #Zagreb #Lifestyle', '12:00', 'lifestyle', ['#Dinamo', '#Zagreb', '#Grad', '#Lifestyle'], 'Profesionalne fotografije igrača ispred katedrale, Trga, Jaruna'),
      scheduled('20b', 'tiktok', 'video', 'Guess the player: Childhood', 'Igra pogadjanja igrača po djecjim fotografijama. Viralni format.', '👶 Pogodite igrača po DJEČJOJ fotki! 😂 Zadnja ce vas šokirati! #Dinamo #GuessThePlayer #FYP', '18:00', 'player_spotlight', ['#Dinamo', '#GuessThePlayer', '#FYP', '#Zabava'], 'Blur reveal format, djecje fotke pa adult reveal, reakcije igrača'),
      scheduled('20c', 'youtube', 'short', 'Fan token ekskluziva', 'Ekskluzivni sadržaj za Socios fan token holdere. Behind-the-scenes pristup.', '🪙 EKSKLUZIVNO za Fan Token holdere! Iza kulisa europske noci! #Dinamo #Socios', '20:00', 'fan_engagement', ['#Dinamo', '#Socios', '#FanToken'], 'Ekskluzivni behind-the-scenes, watermark "FAN TOKEN EXCLUSIVE"'),
    ]],
    [21, [
      scheduled('21a', 'instagram', 'reel', 'Petak vibes', 'Opusteni petak na treningu. Igraci se zabavljaju, smijeh i good vibes.', '😂 Petak na treningu = GOOD VIBES ONLY! 🔵✌️ #Dinamo #Petak #GoodVibes', '15:00', 'behind_scenes', ['#Dinamo', '#GoodVibes', '#Petak'], 'Veseli trenuci, smijeh, salacke igara, glazba u pozadini'),
      scheduled('21b', 'facebook', 'post', 'Subotnja najava', 'Najava sutrašnje utakmice s informacijama o TV prijenosu i live streamu.', '📺 SUTRA | HNL | Dinamo vs Hajduk | 19:00 | Maksimir | DERBI! 🔵🔴 #EterniDerbi', '18:00', 'match_day', ['#Dinamo', '#HNL', '#EterniDerbi', '#DinamoHajduk'], 'Derbi poster, grb vs grb, vatra i strast, "ETERNI DERBI" tipografija'),
    ]],
    [22, [
      scheduled('22a', 'instagram', 'reel', 'DERBI DANA!', 'Matchday content za vjecni derbi. Epska najava s povijesnim momentima.', '🔥 D-E-R-B-I! Dinamo vs Hajduk | Danas. Maksimir. 19:00. BUDITE TU! 🏟️🔵', '09:00', 'match_day', ['#Dinamo', '#EterniDerbi', '#HNL', '#Matchday'], 'Epski mashup: povijesni derbi momenti + sadasnji igraci, dramaticna muzika'),
      scheduled('22b', 'tiktok', 'video', 'Derbi atmosphere', 'Atmosfera pred derbi. Navijaci se okupljaju, baklje, zastave, pjesme.', '🏟️ ATMOSFERA pred Dinamo-Hajduk! Ovo morate doživjeti uživo! 🔵🔥 #EterniDerbi #BBB', '17:00', 'match_day', ['#Dinamo', '#EterniDerbi', '#BBB', '#Atmosfera', '#FYP'], 'POV dolazak na stadion, navijacke pjesme, tifo, baklje (iz daljine)'),
      scheduled('22c', 'instagram', 'story', 'Live updates', 'Stories tijekom utakmice: postava, golovi, poluvrijeme, FT.', '⚽ LIVE | Dinamo vs Hajduk | Pratite nas! 🔵', '18:30', 'match_day', ['#Dinamo', '#EterniDerbi'], 'Story serija: postava grafika, gol celebracije, poluvrijeme stats'),
      scheduled('22d', 'youtube', 'video', 'DERBI HIGHLIGHTS', 'Produzeni highlights vjecnog derbija. Svi golovi, najbolje akcije, atmosfera.', 'HIGHLIGHTS | Dinamo vs Hajduk | Eterni Derbi | HNL 2025/26 ⚽🔥', '23:00', 'match_day', ['#Dinamo', '#Hajduk', '#HNL', '#Derbi', '#Highlights'], 'Cinematic highlights, tribine, golovi iz vise kutova, emocije'),
    ]],
    [23, [
      scheduled('23a', 'instagram', 'carousel', 'Derbi u brojevima', 'Statistika derbija: posjed, udarci, prilike, karta topline. Detaljna analiza.', '📊 DERBI U BROJEVIMA! Dominacija u svakom segmentu 🔵📈 #Dinamo #EterniDerbi #Stats', '12:00', 'match_day', ['#Dinamo', '#EterniDerbi', '#Statistike'], 'Infograficki carousel, heatmap, passing mapa, xG grafikon'),
      scheduled('23b', 'tiktok', 'video', 'Best fan moments: Derbi', 'Kompilacija najljepsih navijackih momenata s derbija. UGC content.', '💙 NAVIJACI NA DERBIJU! Ovo je BBB! 🔵🔥 Tagajte se! #Dinamo #BBB #Derbi #FYP', '18:00', 'fan_engagement', ['#Dinamo', '#BBB', '#Derbi', '#FYP'], 'UGC kompilacija, razliciti kutovi navijača, emotivni trenuci, slavlje'),
    ]],
    [24, [
      scheduled('24a', 'instagram', 'reel', 'Week recap', 'Tjedni pregled: najbolji trenuci iz treninga, utakmice i iza kulisa.', '📅 Tjedan u Dinamu! Derbi pobjeda, trening, i vise! 🔵✨ #Dinamo #TjedniPregled', '17:00', 'behind_scenes', ['#Dinamo', '#TjedniPregled', '#Recap'], 'Montaza tjedna: trening, derbi, slavlje, opusteni trenuci'),
      scheduled('24b', 'facebook', 'post', 'Zahvala navijacima', 'Post zahvale navijacima za fenomenalnu podrsku na derbiju. Community post.', '💙 HVALA! 40.000 navijača na derbiju! Vi ste naš 12. igrač! 🏟️🔵 #Dinamo #Hvala #BBB', '10:00', 'fan_engagement', ['#Dinamo', '#Hvala', '#BBB', '#12Igrač'], 'Panoramska fotografija punog stadiona, "HVALA" tekst overlay'),
    ]],
    [25, [
      scheduled('25a', 'tiktok', 'video', 'Gym session: Snaga i izdržljivost', 'Treninzi snage u teretani. Igraci dizu utege, rade vježbe eksplozivnosti.', '🏋️ GYM DAY! Kako se gradi Dinamo snaga! 💪🔵 #Dinamo #Gym #Fitness #FYP', '09:00', 'behind_scenes', ['#Dinamo', '#Gym', '#Fitness', '#Snaga', '#FYP'], 'Teretana kadrovi, close-up dizanja, znojenje, motivacijska glazba'),
      scheduled('25b', 'instagram', 'carousel', 'Akademija spotlight', 'Profili 3 mlada igrača iz akademije. Statistike, pozicija, potencijal.', '⭐ AKADEMIJA SPOTLIGHT | 3 talenta koja morate pratiti! 🔵 #DinamoAkademija #Talenti', '15:00', 'academy', ['#Dinamo', '#Akademija', '#MladiTalenti', '#Buducnost'], 'Profesionalne fotke mladih igrača, statistike, kratke bio informacije'),
    ]],
    [26, [
      scheduled('26a', 'instagram', 'reel', 'City walk: Zagreb sa igracima', 'Igraci setaju Zagrebom, posjete omiljene restorane, kafice. Lifestyle sadržaj.', '🏙️ Zagreb kroz oči naših igrača! 📸☕ Gdje se vole opustiti? #Dinamo #Zagreb #Lifestyle', '12:00', 'lifestyle', ['#Dinamo', '#Zagreb', '#Lifestyle', '#CityWalk'], 'Vlog stil, igraci u casual odjeci, zagrebacke ulice, kafici, hrana'),
      scheduled('26b', 'youtube', 'video', 'Sezonski recap (do sad)', 'Pregled sezone do sad: rezultati, najbolji momenti, statistike, put do cilja.', '📊 SEZONA 2025/26 — DO SAD! | Sve sto trebate znati! ⚽🔵', '18:00', 'match_day', ['#Dinamo', '#Sezona', '#HNL', '#Recap'], 'Montaza sezone: golovi, slavlja, tablica, put do naslova'),
    ]],
    [27, [
      scheduled('27a', 'tiktok', 'video', 'Igrač odgovara na komentare', 'Igrač cita i odgovara na komentare navijača. Smiješno i iskreno.', '💬 Čitamo VAŠE komentare! 😂 Igrač reagira! #Dinamo #Komentari #React #FYP', '17:00', 'fan_engagement', ['#Dinamo', '#Komentari', '#React', '#FYP'], 'Selfie kamera, igrač cita telefon, reakcije, smijeh'),
      scheduled('27b', 'instagram', 'post', 'Petak motivacija', 'Motivacijski post za kraj tjedna. Fokus na subotnju utakmicu.', '💪 "Svaki dan je prilika da budemo bolji." — Fokus na sutra! 🔵⚡ #Dinamo #Motivacija', '20:00', 'lifestyle', ['#Dinamo', '#Motivacija', '#Fokus'], 'Cinematic fotografija s treninga, quote overlay, plavi ton'),
    ]],
    [28, [
      scheduled('28a', 'instagram', 'reel', 'Matchday: HNL', 'Najava subotnje HNL utakmice. Stadion, igraci, navijaci.', '🏟️ MATCHDAY! HNL | Danas igramo za vas! 🔵⚽ #Dinamo #HNL #Matchday', '10:00', 'match_day', ['#Dinamo', '#HNL', '#Matchday'], 'Hype video: budjenje igrača, put na stadion, ulazak u tunel'),
      scheduled('28b', 'tiktok', 'video', 'Walk out tunnel cam', 'POV izlazak iz tunela na teren. Zvuk navijača, svjetla, adrenalin.', '🚶‍♂️ POV: Izlaziš iz tunela na Maksimiru! 😱🏟️ #Dinamo #TunnelCam #POV #FYP', '17:00', 'match_day', ['#Dinamo', '#TunnelCam', '#POV', '#Matchday'], 'GoPro na prsima igrača, tunel → teren, zvuk navijača eksplodira'),
      scheduled('28c', 'facebook', 'post', 'FT rezultat', 'Rezultat i kratki pregled utakmice.', '⚽ ZAVRŠENO! Dinamo pobjeđuje! 🔵🏆 #Dinamo #HNL #Pobjeda', '19:30', 'match_day', ['#Dinamo', '#HNL', '#Pobjeda'], 'Rezultatska grafika, slavlje igrača'),
    ]],
    [29, [
      scheduled('29a', 'youtube', 'video', 'Full match highlights', 'Produzeni highlights subotnje utakmice. Svi golovi i najbolje akcije.', 'HIGHLIGHTS | Dinamo | HNL 2025/26 | Matchday ⚽🔵', '11:00', 'match_day', ['#Dinamo', '#HNL', '#Highlights'], 'Full HD, vise kutova, atmosfera'),
      scheduled('29b', 'instagram', 'carousel', 'Nedjeljna regeneracija', 'Fotografije igrača na regeneraciji. Bazeni, masaze, istezanje.', '🧘 Nedjelja = Oporavak! Tijelo i um se pripremaju za novo! 🔵💆‍♂️ #Dinamo #Recovery', '14:00', 'behind_scenes', ['#Dinamo', '#Recovery', '#Regeneracija'], 'Fotografije: ledeni bazen, masaza, yoga, opustena atmosfera'),
    ]],
    [30, [
      scheduled('30a', 'instagram', 'reel', 'Mjesecni best of', 'Kompilacija najboljih trenutaka ožujka. Golovi, slavlja, trenuci iza kulisa.', '🏆 NAJBOLJE IZ OŽUJKA! Koji je vaš omiljeni trenutak? 🔵🔥 #Dinamo #Ozujak #BestOf', '18:00', 'fan_engagement', ['#Dinamo', '#BestOf', '#Ozujak', '#Recap'], 'Montaza mjeseca: epski golovi, slavlja, behind the scenes, navijaci'),
      scheduled('30b', 'tiktok', 'video', 'Travanj preview', 'Sto nas ceka u travnju? Raspored, europske utakmice, izazovi.', '📅 TRAVANJ dolazi! Sto nas ceka? 👀🔵 #Dinamo #Travanj #Najava #FYP', '20:00', 'match_day', ['#Dinamo', '#Travanj', '#Najava', '#FYP'], 'Calendar reveal format, matchevi se otkrivaju jedan po jedan, hype'),
    ]],
    [31, [
      scheduled('31a', 'instagram', 'carousel', 'Ozujak u brojevima', 'Mjesecna statistika: golovi, pobjede, angazman na mrežama, rast pratitelja.', '📊 OZUJAK 2026 u brojevima! Mjesec za pamcenje! 🔵📈 #Dinamo #Statistike #Ozujak', '12:00', 'match_day', ['#Dinamo', '#Statistike', '#Ozujak', '#Recap'], 'Infograficki carousel: golovi, posjed, bodovi, rast socijala'),
      scheduled('31b', 'facebook', 'post', 'Hvala za ozujak', 'Zahvala navijacima za podrsku u ozujku. Najava uzbudljivog travnja.', '💙 Hvala vam za nevjerojatan ozujak! Travanj obećava jos vise! 🔵🔥 #Dinamo #Hvala', '18:00', 'fan_engagement', ['#Dinamo', '#Hvala', '#Ozujak', '#Travanj'], 'Kolaž najboljih trenutaka mjeseca, "HVALA" overlay'),
    ]],
  ]

  for (const [day, posts] of futureContent) {
    data[day] = posts
  }

  return data
}

const fallbackCalendar = generateFallbackData()

const fallbackQueue: QueueItem[] = [
  { id: '1', title: 'Najava utakmice: Dinamo vs Hajduk', platform: 'Instagram Reel', author: 'Tim za sadržaj', submitted: 'prije 2 sata', pillar: 'Dan utakmice' },
  { id: '2', title: 'Akademija u fokusu: Highlights omladinskog kupa', platform: 'TikTok video', author: 'Mediji akademije', submitted: 'prije 5 sati', pillar: 'Akademija' },
  { id: '3', title: 'Fan Q&A s Petkovicem', platform: 'YouTube Short', author: 'Odnosi s igracima', submitted: 'prije 1 dan', pillar: 'Igraci' },
  { id: '4', title: 'Iza kulisa: Trening', platform: 'Instagram karusel', author: 'Tim za sadržaj', submitted: 'prije 1 dan', pillar: 'Iza kulisa' },
  { id: '5', title: 'Navijacki event dijaspore — Bec', platform: 'Facebook event', author: 'Tim za zajednicu', submitted: 'prije 2 dana', pillar: 'Zajednica' },
]

const platformColors: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-500',
  tiktok: 'bg-purple-500',
  youtube: 'bg-red-500',
  twitter: 'bg-sky-500',
  web: 'bg-gray-500',
}

const pillarLabels: Record<string, string> = {
  match_day: 'Dan utakmice',
  player_spotlight: 'Igrači',
  behind_scenes: 'Iza kulisa',
  academy: 'Akademija',
  fan_engagement: 'Navijači',
  diaspora: 'Dijaspora',
  european_nights: 'Europske noći',
  lifestyle: 'Lifestyle',
}

const pillarColors: Record<string, string> = {
  match_day: 'bg-red-50 text-red-700',
  player_spotlight: 'bg-blue-50 text-blue-700',
  behind_scenes: 'bg-amber-50 text-amber-700',
  academy: 'bg-green-50 text-green-700',
  fan_engagement: 'bg-purple-50 text-purple-700',
  diaspora: 'bg-cyan-50 text-cyan-700',
  european_nights: 'bg-indigo-50 text-indigo-700',
  lifestyle: 'bg-pink-50 text-pink-700',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function pctChange(current: number, previous: number): { pct: string; up: boolean } {
  if (previous === 0) return { pct: '+100%', up: true }
  const change = ((current - previous) / previous) * 100
  return { pct: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, up: change >= 0 }
}

// ── Drag & Drop helpers ────────────────────────────────────────────

function DraggablePostDot({ post, isPast }: { post: Post; isPast: boolean }) {
  const isDraggable = !isPast && (post.status === 'draft' || post.status === 'scheduled')
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { post },
    disabled: !isDraggable,
  })

  return (
    <div
      ref={setNodeRef}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${platformColors[post.platform]?.replace('bg-', 'bg-') || 'bg-gray-100'} bg-opacity-10 ${isPast ? 'opacity-60' : ''} ${isDragging ? 'opacity-30' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} transition-all hover:bg-opacity-20 group`}
      title={`${post.platform} - ${post.type} - ${post.title}${isDraggable ? ' (povuci za premjestiti)' : ''}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColors[post.status] || 'bg-gray-400'}`} />
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${platformColors[post.platform] || 'bg-gray-400'}`} />
      <span className="text-[9px] text-gray-600 truncate max-w-[60px] hidden sm:inline">{post.title.split(' ')[0]}</span>
    </div>
  )
}

function DroppableDay({ dayNum, children, isOver }: { dayNum: number; children: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef, isOver: dropping } = useDroppable({ id: `day-${dayNum}`, data: { dayNum } })
  const active = isOver || dropping

  return (
    <div ref={setNodeRef} className={active ? 'ring-2 ring-dinamo-blue ring-inset rounded-lg' : ''}>
      {children}
    </div>
  )
}

type ViewMode = 'month' | 'week' | 'sixmonth'
type TabMode = 'calendar' | 'approvals'

export default function ContentCalendar() {
  const navigate = useNavigate()
  const { canApprove } = useAuth()
  const [activeTab, setActiveTab] = useState<TabMode>('calendar')
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentMonth, setCurrentMonth] = useState(2) // March 2026 (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatingVisual, setGeneratingVisual] = useState(false)
  const [generatedData, setGeneratedData] = useState<Record<number, Post[]> | null>(null)
  const [draggedPost, setDraggedPost] = useState<Post | null>(null)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [generatingWeek, setGeneratingWeek] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [focusedDay, setFocusedDay] = useState<number | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // DnD sensors & handlers
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const post = event.active.data.current?.post as Post | undefined
    if (post) setDraggedPost(post)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggedPost(null)
    const { active, over } = event
    if (!over) return

    const post = active.data.current?.post as Post | undefined
    const targetDay = over.data.current?.dayNum as number | undefined
    if (!post || !targetDay) return

    // Find source day
    const data = generatedData || fallbackCalendar
    let sourceDay: number | null = null
    for (const [day, posts] of Object.entries(data)) {
      if (posts.some((p) => p.id === post.id)) {
        sourceDay = Number(day)
        break
      }
    }
    if (sourceDay === null || sourceDay === targetDay) return

    // Move post between days (optimistic update)
    const updated = { ...data }
    updated[sourceDay] = (updated[sourceDay] ?? []).filter((p) => p.id !== post.id)
    if (updated[sourceDay]!.length === 0) delete updated[sourceDay]
    updated[targetDay] = [...(updated[targetDay] || []), post]
    setGeneratedData(updated)

    // Fire API call (best effort)
    contentApi.reschedulePost?.(post.id, { day: targetDay, month: currentMonth + 1, year: currentYear }).catch(() => {})
  }, [generatedData, currentMonth, currentYear])

  // Fetch real metrics for published posts from API
  useEffect(() => {
    if (selectedPost?.status === 'published' && !selectedPost.metrics && !selectedPost.id.startsWith('ai-')) {
      import('../api/analytics').then(({ analyticsApi }) => {
        analyticsApi.getPostMetrics(selectedPost.id).then(res => {
          const m = res.data
          if (m) {
            setSelectedPost(prev => prev ? { ...prev, metrics: {
              views: m.impressions || 0,
              likes: m.likes || 0,
              comments: m.comments || 0,
              shares: m.shares || 0,
              saves: m.saves || 0,
              engagement_rate: m.engagement_rate || 0,
              reach: m.reach || 0,
              impressions: m.impressions || 0,
              prev_week_avg_views: 0,
              prev_week_avg_engagement: 0,
            }} : null)
          }
        }).catch(() => {})
      })
    }
  }, [selectedPost?.id])

  // Lock body scroll when post detail modal is open
  useEffect(() => {
    if (selectedPost) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedPost])

  const queue = fallbackQueue

  const rawCalendarData = generatedData || fallbackCalendar

  // Filter posts based on active filters
  const calendarData = useMemo(() => {
    if (platformFilter === 'all' && statusFilter === 'all' && typeFilter === 'all') {
      return rawCalendarData
    }
    const filtered: Record<number, Post[]> = {}
    for (const [day, posts] of Object.entries(rawCalendarData)) {
      const dayPosts = posts.filter((p) => {
        if (platformFilter !== 'all' && p.platform !== platformFilter) return false
        if (statusFilter !== 'all' && p.status !== statusFilter) return false
        if (typeFilter !== 'all' && p.type !== typeFilter) return false
        return true
      })
      if (dayPosts.length > 0) {
        filtered[Number(day)] = dayPosts
      }
    }
    return filtered
  }, [rawCalendarData, platformFilter, statusFilter, typeFilter])

  const monthNames = ['Sijecanj', 'Veljaca', 'Ozujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac']
  const dayNames = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Cetvrtak', 'Petak', 'Subota']

  const firstDay = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  let firstDayOffset = firstDay.getDay() - 1
  if (firstDayOffset < 0) firstDayOffset = 6
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7
  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
    setGeneratedData(null)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
    setGeneratedData(null)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Start async generation
      const startRes = await contentApi.generateAIPlan({ month: currentMonth + 1, year: currentYear })
      const taskId = startRes.data?.task_id
      if (!taskId) {
        // Direct response (fallback) or error
        const posts = startRes.data?.posts
        if (Array.isArray(posts) && posts.length > 0) {
          setGeneratedData(_groupPosts(posts))
        }
        setGenerating(false)
        return
      }

      // Poll for results every 3 seconds
      const poll = async () => {
        for (let i = 0; i < 60; i++) { // max 3 min
          await new Promise(r => setTimeout(r, 3000))
          try {
            const pollRes = await contentApi.getAIPlanResult(taskId)
            const status = pollRes.data?.status
            if (status === 'done') {
              const posts = pollRes.data?.posts
              if (Array.isArray(posts) && posts.length > 0) {
                setGeneratedData(_groupPosts(posts))
              }
              return
            } else if (status === 'error') {
              return
            }
            // status === 'running' → continue polling
          } catch {
            // Network error, keep polling
          }
        }
      }
      await poll()
    } catch {
      // Keep existing data on error
    } finally {
      setGenerating(false)
    }
  }

  const _groupPosts = (posts: any[]): Record<number, Post[]> => {
    const grouped: Record<number, Post[]> = {}
    for (const p of posts) {
      const day = p.day || 1
      if (!grouped[day]) grouped[day] = []
      grouped[day].push({
        id: `ai-${day}-${grouped[day].length}`,
        platform: p.platform || 'instagram',
        type: p.type || 'post',
        title: p.title || '',
        description: p.description || '',
        caption_hr: p.caption_hr || '',
        scheduled_time: p.scheduled_time || '12:00',
        content_pillar: p.content_pillar || 'lifestyle',
        hashtags: p.hashtags || [],
        visual_brief: p.visual_brief || '',
        visual_url: p.visual_url || undefined,
        status: 'draft' as const,
      })
    }
    return grouped
  }

  const handleApprove = async (id: string) => {
    try { await contentApi.approvePost(id) } catch { /* fallback */ }
  }

  const handleReject = async (id: string) => {
    try { await contentApi.rejectPost(id, 'Odbijeno') } catch { /* fallback */ }
  }

  // Generate week handler
  const handleGenerateWeek = async () => {
    setGeneratingWeek(true)
    try {
      const weekStart = todayDay > 0 ? todayDay : 1
      const weekEnd = Math.min(weekStart + 6, daysInMonth)
      const startRes = await contentApi.generateAIPlan({ month: currentMonth + 1, year: currentYear })
      const taskId = startRes.data?.task_id
      if (!taskId) {
        const posts = startRes.data?.posts
        if (Array.isArray(posts) && posts.length > 0) {
          const weekPosts = posts.filter((p: { day?: number }) => {
            const d = p.day || 1
            return d >= weekStart && d <= weekEnd
          })
          if (weekPosts.length > 0) {
            const grouped = _groupPosts(weekPosts)
            const merged = { ...(generatedData || fallbackCalendar) }
            for (const [day, dayPosts] of Object.entries(grouped)) {
              merged[Number(day)] = dayPosts
            }
            setGeneratedData(merged)
          }
        }
        setGeneratingWeek(false)
        return
      }
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try {
          const pollRes = await contentApi.getAIPlanResult(taskId)
          const status = pollRes.data?.status
          if (status === 'done') {
            const posts = pollRes.data?.posts
            if (Array.isArray(posts) && posts.length > 0) {
              const weekPosts = posts.filter((p: { day?: number }) => {
                const d = p.day || 1
                return d >= weekStart && d <= weekEnd
              })
              if (weekPosts.length > 0) {
                const grouped = _groupPosts(weekPosts)
                const merged = { ...(generatedData || fallbackCalendar) }
                for (const [day, dayPosts] of Object.entries(grouped)) {
                  merged[Number(day)] = dayPosts
                }
                setGeneratedData(merged)
              }
            }
            return
          } else if (status === 'error') return
        } catch { /* keep polling */ }
      }
    } catch { /* keep existing */ } finally {
      setGeneratingWeek(false)
    }
  }

  // Publish handler for modal
  const handlePublishFromModal = async () => {
    if (!selectedPost) return
    setPublishing(true)
    try {
      const res = await contentApi.publishPost(selectedPost.id)
      const data = res.data
      if (data.success) {
        setSelectedPost({
          ...selectedPost,
          status: 'published',
          platform_post_url: data.platform_post_url,
          publish_error: undefined,
        })
      } else {
        setSelectedPost({
          ...selectedPost,
          publish_error: data.error || 'Objavljivanje nije uspjelo',
        })
      }
    } catch {
      setSelectedPost({
        ...selectedPost,
        publish_error: 'Mrezna greska pri objavljivanju',
      })
    } finally {
      setPublishing(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (activeTab !== 'calendar' || viewMode !== 'month' || selectedPost) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowRight': {
          e.preventDefault()
          setFocusedDay(prev => {
            const next = (prev || 0) + 1
            return next > daysInMonth ? 1 : next
          })
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          setFocusedDay(prev => {
            const next = (prev || 2) - 1
            return next < 1 ? daysInMonth : next
          })
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          setFocusedDay(prev => {
            const next = (prev || 0) + 7
            return next > daysInMonth ? ((next - 1) % daysInMonth) + 1 : next
          })
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setFocusedDay(prev => {
            const next = (prev || 8) - 7
            return next < 1 ? daysInMonth + next : next
          })
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (focusedDay) {
            setSelectedDay(focusedDay)
            const posts = calendarData[focusedDay]
            if (posts && posts.length === 1 && posts[0]) {
              setSelectedPost(posts[0])
            }
          }
          break
        }
        case 'Escape': {
          e.preventDefault()
          if (selectedDay) setSelectedDay(null)
          else setFocusedDay(null)
          break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, viewMode, selectedPost, focusedDay, daysInMonth, calendarData, selectedDay])

  const selectedDayPosts = selectedDay ? (calendarData[selectedDay] || []) : []

  const totalPosts = Object.values(calendarData).reduce((sum, posts) => sum + posts.length, 0)
  const daysWithContent = Object.keys(calendarData).length

  return (
    <div className="animate-fade-in">
      <Header
        title="KALENDAR SADRŽAJA"
        subtitle={`${monthNames[currentMonth]} ${currentYear} — Planiranje i odobrenja`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateWeek}
              disabled={generatingWeek || generating}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              {generatingWeek ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
              {generatingWeek ? 'Generiranje...' : 'Generiraj tjedan'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Generiranje...' : 'AI Generiraj plan'}
            </button>
          </div>
        }
      />

      <div className="page-wrapper space-y-6">
        {/* Tabs + View Mode */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 border-b border-gray-200 pb-1">
            <button onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-dinamo-blue text-dinamo-blue-dark' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Calendar size={16} className="inline mr-2" />Kalendar
            </button>
            <button onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'approvals' ? 'border-dinamo-blue text-dinamo-blue-dark' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Clock size={16} className="inline mr-2" />Red za odobrenje
              <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">{queue.length}</span>
            </button>
          </div>

          {activeTab === 'calendar' && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <BarChart3 size={14} />
                <span>{totalPosts} objava</span>
                <span>·</span>
                <span>{daysWithContent}/{daysInMonth} dana</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                {([['month', LayoutGrid, 'Mjesec'], ['week', List, 'Tjedan'], ['sixmonth', CalendarDays, '6 mjeseci']] as const).map(([mode, Icon, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Icon size={14} /><span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter controls */}
        {activeTab === 'calendar' && (
          <div className="card !py-3 !px-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                <Filter size={14} />
                <span className="font-medium">Filteri:</span>
              </div>

              {/* Platform filter */}
              <div className="flex items-center gap-1">
                {PLATFORM_FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setPlatformFilter(value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      platformFilter === value
                        ? 'bg-dinamo-blue text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {Icon && <Icon size={12} />}
                    {label}
                  </button>
                ))}
              </div>

              <div className="hidden lg:block w-px h-5 bg-gray-200" />

              {/* Status filter */}
              <div className="flex items-center gap-1">
                {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => setStatusFilter(value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === value
                        ? 'bg-dinamo-blue text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="hidden lg:block w-px h-5 bg-gray-200" />

              {/* Type filter */}
              <div className="flex items-center gap-1">
                {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => setTypeFilter(value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      typeFilter === value
                        ? 'bg-dinamo-blue text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Clear filters */}
              {(platformFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all') && (
                <button
                  onClick={() => { setPlatformFilter('all'); setStatusFilter('all'); setTypeFilter('all') }}
                  className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X size={12} />
                  Ocisti filtere
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generating overlay */}
        {(generating || generatingWeek) && (
          <div className="card flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 size={40} className="animate-spin text-dinamo-blue mx-auto" />
              <p className="text-lg font-medium text-gray-900">
                {generatingWeek ? 'Generiranje tjednog plana...' : 'Gemini AI generira plan...'}
              </p>
              <p className="text-sm text-gray-500">
                {generatingWeek
                  ? 'Kreira sadržaj za ovaj tjedan'
                  : `Analizira Dinamov sadržaj i kreira kvalitetne ideje za ${monthNames[currentMonth]}`}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && viewMode === 'month' && !generating && !generatingWeek && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6">
            {/* Mini Calendar Sidebar */}
            <div className="hidden xl:block" style={{ width: '220px', minWidth: '220px' }}>
              <div className="card !p-3 sticky top-4">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-bold text-gray-700">{monthNames[currentMonth]} {currentYear}</span>
                  <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"><ChevronRight size={14} /></button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <div key={d} className="text-center text-[9px] text-gray-400 font-medium py-0.5">{d.charAt(0)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: totalCells }, (_, i) => {
                    const dn = i - firstDayOffset + 1
                    const valid = dn >= 1 && dn <= daysInMonth
                    const hasPosts = valid && (calendarData[dn]?.length || 0) > 0
                    const isTd = dn === todayDay
                    const isSel = dn === selectedDay
                    const isFoc = dn === focusedDay
                    return (
                      <button key={i} disabled={!valid}
                        onClick={() => valid && setSelectedDay(isSel ? null : dn)}
                        className={`w-full aspect-square flex items-center justify-center text-[10px] rounded transition-colors relative ${
                          !valid ? 'text-transparent cursor-default'
                          : isSel ? 'bg-dinamo-blue text-white font-bold'
                          : isFoc ? 'bg-dinamo-blue/10 text-dinamo-blue font-bold ring-1 ring-dinamo-blue/40'
                          : isTd ? 'bg-blue-100 text-blue-800 font-bold'
                          : 'text-gray-600 hover:bg-gray-100'
                        }`}>
                        {valid ? dn : ''}
                        {hasPosts && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-dinamo-blue" />}
                      </button>
                    )
                  })}
                </div>
                {/* Quick month jumps */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wider">Brzi pristup</p>
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 12 }, (_, i) => (
                      <button key={i}
                        onClick={() => { setCurrentMonth(i); setSelectedDay(null); setGeneratedData(null) }}
                        className={`text-[10px] py-1 rounded transition-colors ${
                          currentMonth === i ? 'bg-dinamo-blue text-white font-bold' : 'text-gray-500 hover:bg-gray-100'
                        }`}>
                        {monthNames[i]!.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Keyboard hint */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wider">Precice</p>
                  <div className="space-y-0.5 text-[10px] text-gray-400">
                    <p><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">&#8592;&#8593;&#8594;&#8595;</kbd> Navigacija</p>
                    <p><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Enter</kbd> Otvori dan</p>
                    <p><kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Esc</kbd> Zatvori</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div ref={calendarRef} className="card min-w-0 flex-1">
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold text-gray-900">{monthNames[currentMonth]!.toUpperCase()} {currentYear}</h2>
                <button onClick={nextMonth} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={20} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDayOffset + 1
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth
                  const isToday = dayNum === todayDay
                  const isSelected = dayNum === selectedDay
                  const isFocused = dayNum === focusedDay
                  const isPast = isValid && isCurrentMonth && dayNum < todayDay
                  const posts = isValid ? (calendarData[dayNum] || []) : []

                  const cell = (
                    <div key={i} onClick={() => { if (isValid) { setSelectedDay(isSelected ? null : dayNum); setFocusedDay(dayNum) } }}
                      className={`min-h-[72px] sm:min-h-[90px] p-2 rounded-lg border transition-all ${
                        !isValid ? 'border-transparent bg-transparent pointer-events-none'
                        : isSelected ? 'border-dinamo-blue bg-dinamo-blue/5 ring-1 ring-dinamo-blue/20 cursor-pointer'
                        : isFocused ? 'border-dinamo-blue/50 bg-dinamo-blue/[0.02] cursor-pointer ring-1 ring-dinamo-blue/10'
                        : isToday ? 'border-blue-400 bg-blue-50 cursor-pointer'
                        : isPast ? 'border-gray-200 bg-gray-50/50 cursor-pointer'
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
                      }`}>
                      {isValid && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold' : isSelected ? 'text-dinamo-blue-dark font-bold' : isPast ? 'text-gray-400' : 'text-gray-600'}`}>
                              {dayNum}
                            </span>
                            {posts.length > 0 && (
                              <span className={`text-[10px] font-mono ${posts.length >= 3 ? 'text-green-700 font-bold' : 'text-gray-400'}`}>{posts.length}</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {posts.slice(0, 3).map((post) => (
                              <DraggablePostDot key={post.id} post={post} isPast={!!isPast} />
                            ))}
                            {posts.length > 3 && <span className="text-[9px] text-gray-400 pl-0.5">+{posts.length - 3} vise</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )

                  return isValid ? (
                    <DroppableDay key={i} dayNum={dayNum}>{cell}</DroppableDay>
                  ) : cell
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Platforme:</span>
                {Object.entries(platformColors).slice(0, 4).map(([platform, color]) => (
                  <div key={platform} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs text-gray-500 capitalize">{platform}</span>
                  </div>
                ))}
                <span className="text-xs text-gray-300 mx-1">|</span>
                <span className="text-xs text-gray-500 font-medium">Status:</span>
                {[['published', 'Objavljeno', 'bg-green-500'], ['scheduled', 'Zakazano', 'bg-blue-500'], ['draft', 'Draft', 'bg-yellow-500']].map(([status, label, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Detail Panel */}
            {selectedDay && (
              <div className="hidden lg:block card animate-slide-in max-h-[calc(100vh-200px)] overflow-y-auto" style={{ width: '384px', minWidth: '384px', maxWidth: '384px' }}>
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedDay}. {monthNames[currentMonth]}</h3>
                    <p className="text-xs text-gray-500">{dayNames[new Date(currentYear, currentMonth, selectedDay).getDay()]}</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded"><X size={16} className="text-gray-500" /></button>
                </div>

                {selectedDayPosts.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">Nema objava za ovaj dan</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayPosts.map((post) => {
                      const isPast = post.status === 'published' || post.status === 'missed'
                      return (
                        <div key={post.id} onClick={() => setSelectedPost(post)}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                          {/* Status + Time */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={post.platform} size="sm" />
                              <span className="text-xs font-medium text-gray-500 capitalize">{post.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{post.scheduled_time}</span>
                              {post.status === 'published' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Objavljeno</span>}
                              {post.status === 'scheduled' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Zakazano</span>}
                              {post.status === 'draft' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">Draft</span>}
                              {post.status === 'missed' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">Propušteno</span>}
                            </div>
                          </div>

                          {/* Title */}
                          <p className="text-sm text-gray-900 font-medium">{post.title}</p>

                          {/* Pillar tag */}
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${pillarColors[post.content_pillar] || 'bg-gray-50 text-gray-500'}`}>
                            {pillarLabels[post.content_pillar] || post.content_pillar}
                          </span>

                          {/* Metrics for published posts */}
                          {isPast && post.metrics && (
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500 flex items-center gap-1"><Eye size={11} /> {formatNumber(post.metrics.views)}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1"><Heart size={11} /> {formatNumber(post.metrics.likes)}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1"><MessageCircle size={11} /> {formatNumber(post.metrics.comments)}</span>
                              <span className={`text-xs font-bold ${post.metrics.engagement_rate > 5 ? 'text-green-700' : 'text-gray-500'}`}>{post.metrics.engagement_rate}%</span>
                            </div>
                          )}

                          {/* Description for future posts */}
                          {!isPast && post.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.description}</p>
                          )}

                          {/* Hashtags preview */}
                          {!isPast && post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {post.hashtags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] text-blue-700">{tag}</span>
                              ))}
                              {post.hashtags.length > 3 && <span className="text-[10px] text-gray-500">+{post.hashtags.length - 3}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DragOverlay>
            {draggedPost && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border-2 border-dinamo-blue shadow-lg text-xs">
                <div className={`w-3 h-3 rounded-full ${platformColors[draggedPost.platform] || 'bg-gray-400'}`} />
                <span className="font-medium text-gray-900 truncate max-w-[150px]">{draggedPost.title}</span>
              </div>
            )}
          </DragOverlay>
          </DndContext>
        )}

        {activeTab === 'calendar' && viewMode === 'sixmonth' && !generating && !generatingWeek && (
          <div className="card">
            <h2 className="section-title mb-6">6-Mjesecni pregled plana</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }, (_, i) => {
                const m = (currentMonth + i) % 12
                const y = currentYear + Math.floor((currentMonth + i) / 12)
                return (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-dinamo-blue/30 transition-colors cursor-pointer"
                    onClick={() => { setCurrentMonth(m); setCurrentYear(y); setViewMode('month') }}>
                    <p className="text-sm font-medium text-gray-900">{monthNames[m]}</p>
                    <p className="text-xs text-gray-500">{y}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Objave</span>
                        <span className="text-gray-700 font-mono">{i === 0 ? totalPosts : '—'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && viewMode === 'week' && !generating && !generatingWeek && (
          <div className="card">
            <h2 className="section-title mb-4">Tjedni pregled</h2>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day, idx) => {
                const dayNum = todayDay > 0 ? todayDay - today.getDay() + 1 + idx : idx + 1
                const posts = calendarData[dayNum] || []
                const isPast = isCurrentMonth && dayNum < todayDay
                return (
                  <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 text-center">
                      <p className="text-xs text-gray-500">{day}</p>
                      <p className={`text-lg font-bold ${dayNum === todayDay ? 'text-blue-700' : 'text-gray-900'}`}>{dayNum > 0 && dayNum <= daysInMonth ? dayNum : '—'}</p>
                    </div>
                    <div className="flex-1 flex gap-2 flex-wrap">
                      {posts.map((post) => (
                        <div key={post.id} onClick={() => setSelectedPost(post)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[post.status] || 'bg-gray-400'}`} />
                          <PlatformIcon platform={post.platform} size="sm" />
                          <span className="text-xs text-gray-700 font-medium">{post.title || post.type}</span>
                          <span className="text-[10px] text-gray-400 capitalize">{post.type}</span>
                          {isPast && post.metrics && <span className="text-[10px] text-green-700 font-bold">{post.metrics.engagement_rate}%</span>}
                        </div>
                      ))}
                      {posts.length === 0 && <span className="text-xs text-gray-400 italic">Nema objava</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Approval Queue */}
        {activeTab === 'approvals' && (
          <div className="card">
            <h2 className="section-title mb-4">Ceka odobrenje</h2>
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white text-gray-500">{item.pillar}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{item.platform}</span><span>|</span><span>{item.author}</span><span>|</span><span>{item.submitted}</span>
                    </div>
                  </div>
                  {canApprove && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors">
                        <Check size={14} />Odobri
                      </button>
                      <button onClick={() => handleReject(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs rounded-lg border border-red-200 transition-colors">
                        <X size={14} />Odbij
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POST DETAIL MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>

            {/* Header with platform color stripe */}
            <div className={`h-1 ${platformColors[selectedPost.platform] || 'bg-gray-400'}`} />
            <div className="px-6 py-4 flex items-start justify-between border-b border-gray-200">
              <div className="flex items-start gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedPost.status === 'published' ? 'bg-green-50' :
                  selectedPost.status === 'approved' ? 'bg-emerald-50' :
                  selectedPost.status === 'scheduled' ? 'bg-blue-50' :
                  selectedPost.status === 'draft' ? 'bg-yellow-50' :
                  selectedPost.status === 'failed' ? 'bg-red-50' : 'bg-red-50'
                }`}>
                  <PlatformIcon platform={selectedPost.platform} size="md" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{selectedPost.title}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-gray-500 capitalize bg-gray-50 px-2 py-0.5 rounded">{selectedPost.type}</span>
                    <span className="text-[11px] text-gray-500">{selectedPost.scheduled_time}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pillarColors[selectedPost.content_pillar] || 'bg-gray-50 text-gray-500'}`}>
                      {pillarLabels[selectedPost.content_pillar] || selectedPost.content_pillar}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      selectedPost.status === 'published' ? 'bg-green-50 text-green-700' :
                      selectedPost.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      selectedPost.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                      selectedPost.status === 'draft' ? 'bg-yellow-50 text-yellow-700' :
                      selectedPost.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {selectedPost.status === 'published' ? 'Objavljeno' :
                       selectedPost.status === 'approved' ? 'Odobreno' :
                       selectedPost.status === 'scheduled' ? 'Zakazano' :
                       selectedPost.status === 'draft' ? 'Draft' :
                       selectedPost.status === 'failed' ? 'Neuspjelo' : 'Propušteno'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPost(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <div className="px-6 py-5 space-y-5">

                {/* Metrics grid for published posts */}
                {selectedPost.metrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Pregledi', value: selectedPost.metrics.views, icon: Eye },
                        { label: 'Doseg', value: selectedPost.metrics.reach, icon: Target },
                        { label: 'Lajkovi', value: selectedPost.metrics.likes, icon: Heart },
                        { label: 'Angažman', value: selectedPost.metrics.engagement_rate, icon: TrendingUp, suffix: '%' },
                      ].map(({ label, value, icon: Icon, suffix }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <Icon size={14} className="text-gray-500 mx-auto mb-1" />
                          <p className="text-base font-bold text-gray-900 font-headline">{suffix ? value + suffix : formatNumber(value)}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Komentari', value: selectedPost.metrics.comments, icon: MessageCircle },
                        { label: 'Dijeljenja', value: selectedPost.metrics.shares, icon: Share2 },
                        { label: 'Spremljeno', value: selectedPost.metrics.saves, icon: Bookmark },
                        { label: 'Prikazivanja', value: selectedPost.metrics.impressions, icon: Zap },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <Icon size={14} className="text-gray-500 mx-auto mb-1" />
                          <p className="text-base font-bold text-gray-900 font-headline">{formatNumber(value)}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Week comparison inline */}
                    <div className="flex gap-3">
                      {(() => {
                        const viewsChange = pctChange(selectedPost.metrics!.views, selectedPost.metrics!.prev_week_avg_views)
                        const engChange = pctChange(selectedPost.metrics!.engagement_rate, selectedPost.metrics!.prev_week_avg_engagement)
                        return [
                          { label: 'Pregledi vs prošli tjedan', pct: viewsChange.pct, up: viewsChange.up },
                          { label: 'Angažman vs prošli tjedan', pct: engChange.pct, up: engChange.up },
                        ].map(({ label, pct, up }) => (
                          <div key={label} className={`flex-1 rounded-xl p-3 ${up ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            <div className="flex items-center gap-1.5">
                              {up ? <TrendingUp size={14} className="text-emerald-700" /> : <TrendingDown size={14} className="text-red-700" />}
                              <span className={`text-sm font-bold ${up ? 'text-emerald-700' : 'text-red-700'}`}>{pct}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">{label}</p>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedPost.description && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Opis</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedPost.description}</p>
                  </div>
                )}

                {/* Caption */}
                {selectedPost.caption_hr && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {selectedPost.metrics ? 'Caption' : 'Predloženi caption'}
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedPost.caption_hr}</p>
                    </div>
                  </div>
                )}

                {/* Visual preview + generation */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Vizual</p>
                  {selectedPost.visual_url ? (
                    <div className="space-y-2">
                      <div className="rounded-xl overflow-hidden border border-gray-200">
                        <img
                          src={selectedPost.visual_url.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}${selectedPost.visual_url}` : selectedPost.visual_url}
                          alt={selectedPost.title}
                          className="w-full h-auto object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            setGeneratingVisual(true)
                            const res = await contentApi.generateVisual(selectedPost.id)
                            setSelectedPost({ ...selectedPost, visual_url: res.data.visual_url })
                          } catch { /* ignore */ } finally { setGeneratingVisual(false) }
                        }}
                        disabled={generatingVisual}
                        className="text-xs text-blue-700 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Sparkles size={12} />
                        {generatingVisual ? 'Generiranje...' : 'Regeneriraj vizual'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPost.visual_brief && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Vizualni smjer</p>
                          <p className="text-sm text-gray-500 leading-relaxed">{selectedPost.visual_brief}</p>
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            setGeneratingVisual(true)
                            const res = await contentApi.generateVisual(selectedPost.id)
                            setSelectedPost({ ...selectedPost, visual_url: res.data.visual_url })
                          } catch { /* ignore */ } finally { setGeneratingVisual(false) }
                        }}
                        disabled={generatingVisual}
                        className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2 border border-blue-200"
                      >
                        {generatingVisual ? (
                          <><Loader2 size={14} className="animate-spin" /> Generiranje vizuala...</>
                        ) : (
                          <><Sparkles size={14} /> Generiraj vizual</>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.hashtags.map((tag) => (
                        <span key={tag} className="text-[12px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Published post link */}
                {selectedPost.platform_post_url && selectedPost.status === 'published' && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Objavljeno na</p>
                    <a href={selectedPost.platform_post_url} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-blue-700 hover:text-blue-600 underline break-all">
                      {selectedPost.platform_post_url}
                    </a>
                  </div>
                )}

                {/* Publish error */}
                {selectedPost.publish_error && (selectedPost.status === 'failed' || selectedPost.status === 'approved') && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider mb-1">Greška pri objavljivanju</p>
                    <p className="text-sm text-red-700">{selectedPost.publish_error}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 space-y-2">
                  {/* Publish button - for scheduled, draft, approved, failed posts */}
                  {selectedPost.status !== 'published' && (
                    <button
                      onClick={handlePublishFromModal}
                      disabled={publishing}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      {publishing ? (
                        <><Loader2 size={16} className="animate-spin" /> Objavljivanje...</>
                      ) : (
                        <><Send size={16} /> Objavi sada</>
                      )}
                    </button>
                  )}

                  {/* Open Studio button */}
                  <button
                    onClick={() => navigate(`/studio/${selectedPost.id}`, { state: { post: selectedPost } })}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Film size={16} />
                    Otvori Content Studio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
