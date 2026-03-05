import { useState, useMemo } from 'react'
import Header from '../components/layout/Header'
import PlatformIcon from '../components/common/PlatformIcon'
import { contentApi } from '../api/content'
import {
  Calendar, ChevronLeft, ChevronRight, Check, X, Clock, Sparkles,
  Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp, TrendingDown,
  LayoutGrid, List, CalendarDays, Loader2, BarChart3, Target, Zap,
} from 'lucide-react'

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
  status: 'published' | 'scheduled' | 'draft' | 'missed'
  metrics?: PostMetrics
}

interface QueueItem {
  id: string
  title: string
  platform: string
  author: string
  submitted: string
  pillar: string
}

// Rich fallback data for March 2026
function generateFallbackData(): Record<number, Post[]> {
  const data: Record<number, Post[]> = {}

  const published = (id: string, platform: string, type: string, title: string, desc: string, caption: string, time: string, pillar: string, hashtags: string[], visual: string, metrics: PostMetrics): Post => ({
    id, platform, type, title, description: desc, caption_hr: caption, scheduled_time: time, content_pillar: pillar, hashtags, visual_brief: visual, status: 'published', metrics,
  })

  const scheduled = (id: string, platform: string, type: string, title: string, desc: string, caption: string, time: string, pillar: string, hashtags: string[], visual: string): Post => ({
    id, platform, type, title, description: desc, caption_hr: caption, scheduled_time: time, content_pillar: pillar, hashtags, visual_brief: visual, status: 'scheduled',
  })

  // Day 1 - Sunday (past)
  data[1] = [
    published('1a', 'instagram', 'reel', 'Nedjeljna regeneracija', 'Igraci na laganom treningu nakon pobjede u HNL-u. Opustena atmosfera, smijeh i timski duh.', 'Nedjelja = regeneracija! 💪 Tijelo odmara, ali duh je uvijek spreman. #Dinamo #Modri #HNL', '10:00', 'behind_scenes', ['#Dinamo', '#Modri', '#Trening', '#HNL'], 'Slow-motion kadrovi igraca na treningu, plavi filter, opustena glazba', { views: 45200, likes: 3820, comments: 187, shares: 412, saves: 298, engagement_rate: 4.2, reach: 89400, impressions: 112000, prev_week_avg_views: 38000, prev_week_avg_engagement: 3.8 }),
    published('1b', 'facebook', 'post', 'Rezultati omladinskog kupa', 'U19 reprezentacija pobijedila u polufinalu omladinskog kupa. Detaljan izvjestaj s utakmice.', '⚽ U19 u finalu! Nasa mladost, nasa buducnost. Cestitamo nasim mladim lavovima! 🦁🔵 #DinamoAkademija', '14:00', 'academy', ['#Dinamo', '#Akademija', '#U19', '#Buducnost'], 'Fotografija U19 tima sa slavljem, grb kluba u kutu', { views: 12800, likes: 1540, comments: 89, shares: 234, saves: 45, engagement_rate: 3.1, reach: 42000, impressions: 58000, prev_week_avg_views: 11000, prev_week_avg_engagement: 2.8 }),
    published('1c', 'tiktok', 'video', 'Tko je najbrzi? Challenge', 'Sprint challenge izmedju trojice igraca na treningu. Zabavan sadrzaj za mlade navijace.', 'Tko je NAJBRŽI u Dinamu?! 🏃‍♂️💨 Pogledajte i dajte svoj glas! #Dinamo #Challenge #Brzi', '18:00', 'player_spotlight', ['#Dinamo', '#Challenge', '#Nogomet', '#HNL', '#FYP'], 'Vertikalni format, split screen utrka, timer overlay, energicna glazba', { views: 128000, likes: 14200, comments: 892, shares: 3400, saves: 1200, engagement_rate: 7.8, reach: 245000, impressions: 310000, prev_week_avg_views: 95000, prev_week_avg_engagement: 6.2 }),
  ]

  // Day 2 - Monday (past)
  data[2] = [
    published('2a', 'instagram', 'carousel', 'Igrač tjedna: Petković', 'Statistike, highlights i osobna prica o najboljem igracu proslog tjedna.', 'Bruno Petković — nas br. 9 je opet pokazao klasu! 🔥 Hat-trick heroj. Swipe za sve statse ➡️ #Dinamo #Petković #HNL', '12:00', 'player_spotlight', ['#Dinamo', '#Petković', '#IgračTjedna', '#HNL'], '5-slide carousel: slide 1 akcijska fotka, slide 2-4 statistike na plavoj pozadini, slide 5 quote igraca', { views: 67800, likes: 8920, comments: 456, shares: 1230, saves: 890, engagement_rate: 5.8, reach: 134000, impressions: 178000, prev_week_avg_views: 52000, prev_week_avg_engagement: 4.9 }),
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
    published('4b', 'tiktok', 'video', 'Tunnel cam: Dolazak igraca', 'Igraci dolaze na stadion za europsku utakmicu. Svaki igrac sa svojim stilom.', '🚶‍♂️ Arrival day. Svaki od njih zna sto treba napraviti. #Dinamo #UEL #MatchDay #Tunnel', '17:00', 'european_nights', ['#Dinamo', '#UEL', '#MatchDay', '#Tunnel', '#FYP'], 'Slo-mo igračkih dolazaka, kožne jakne, slušalice, fokusirani pogledi, dramska muzika', { views: 156000, likes: 18900, comments: 2100, shares: 6700, saves: 3400, engagement_rate: 8.9, reach: 298000, impressions: 380000, prev_week_avg_views: 95000, prev_week_avg_engagement: 6.2 }),
    published('4c', 'youtube', 'video', 'HIGHLIGHTS: Dinamo vs Roma', 'Produzeni highlights europske utakmice. Svi golovi i najbolje akcije.', 'HIGHLIGHTS | Dinamo Zagreb vs AS Roma | UEL Quarter-Final ⚽', '23:00', 'european_nights', ['#Dinamo', '#UEL', '#Highlights', '#DinamoRoma'], 'Full HD highlights, 10-minutni video, svi golovi iz vise kutova, atmosfera s tribina', { views: 412000, likes: 28400, comments: 3450, shares: 12300, saves: 8900, engagement_rate: 6.8, reach: 680000, impressions: 890000, prev_week_avg_views: 28000, prev_week_avg_engagement: 3.7 }),
    published('4d', 'facebook', 'post', 'FT: Dinamo 2-1 Roma!', 'Rezultat i kratki pregled utakmice za Facebook zajednicu.', '⚽ POBJEDA! 🔵 Dinamo 2-1 AS Roma! Europska noc za pamcenje! 🏟️🇭🇷 #Dinamo #UEL', '22:30', 'european_nights', ['#Dinamo', '#UEL', '#Pobjeda'], 'Rezultatska grafika, slavlje igraca, plave boje', { views: 78000, likes: 9800, comments: 2340, shares: 5600, saves: 890, engagement_rate: 7.2, reach: 145000, impressions: 198000, prev_week_avg_views: 11000, prev_week_avg_engagement: 2.8 }),
  ]

  // Day 5 - Thursday (today) - post-match
  data[5] = [
    published('5a', 'instagram', 'reel', 'Best moments: Dinamo vs Roma', 'Najbolji trenuci europske noci u 30 sekundi. Emotivni video za IG.', '🎬 Europska noć. Maksimir. Pobjeda. 🔵⚡ Ovo su trenuci za koje živimo! #Dinamo #UEL #Modri', '10:00', 'european_nights', ['#Dinamo', '#UEL', '#BestMoments', '#Modri'], '30s reel: najljepsi trenuci iz utakmice, spora snimka golova, navijacko slavlje', { views: 234000, likes: 31200, comments: 2890, shares: 9800, saves: 5600, engagement_rate: 9.4, reach: 420000, impressions: 540000, prev_week_avg_views: 38000, prev_week_avg_engagement: 3.8 }),
    scheduled('5b', 'tiktok', 'video', 'Petković gol reakcija', 'Slow motion Petkovićev gol iz svih kuteva kamere + reakcija klupe i navijača.', '🎯 PETKOVIĆ! Pogledajte ovaj gol iz SVIH kutova! 😱🔥 #Dinamo #Gol #Petković #UEL', '17:00', 'european_nights', ['#Dinamo', '#Petković', '#Gol', '#UEL', '#FYP'], 'Multi-angle replay, slow motion, reakcija klupe, zvuk gola + navijaca'),
    scheduled('5c', 'youtube', 'short', 'Press konferencija highlights', 'Najbolji trenuci s press konferencije nakon utakmice. Trenerov komentar.', 'Trener nakon pobjede nad Romom: "Ovo je samo početak!" 🎙️ #Dinamo #UEL', '20:00', 'european_nights', ['#Dinamo', '#UEL', '#Press', '#Trener'], 'Vertikalni crop press konferencije, titlovi na hrvatskom, plavi overlay'),
  ]

  // Days 6-31 - Future days with scheduled content
  const futureContent: [number, Post[]][] = [
    [6, [
      scheduled('6a', 'instagram', 'carousel', 'UEL statistike', 'Infografika s detaljnim statistikama utakmice protiv Rome. Posjed, udarci, prilike.', '📊 Brojke govore same za sebe! Dinamo vs Roma u statistikama ➡️ #Dinamo #UEL #Stats', '12:00', 'european_nights', ['#Dinamo', '#UEL', '#Statistike'], 'Statistički carousel: 5 slajdova s grafovima i brojevima, plava/bijela tema'),
      scheduled('6b', 'facebook', 'post', 'Fan foto galerija', 'Najbolje fotografije navijaca s europske noci. UGC sadrzaj s tribina Maksimira.', '📸 Vaše fotke s Maksimira! Hvala vam na nevjerojatnoj atmosferi! Tagajte se! 🔵🏟️ #BBB #Dinamo', '18:00', 'fan_engagement', ['#Dinamo', '#BBB', '#Navijaci', '#Maksimir'], 'Kolaž navijačkih fotografija, poziv na tagging, plavi okvir'),
    ]],
    [7, [
      scheduled('7a', 'instagram', 'reel', 'Subotnja najava: HNL', 'Matchday najava za subotnju HNL utakmicu. Hype video s najavaom protivnika.', '🏟️ Subota. HNL. Mi smo spremni, a vi? 🔵⚡ #Dinamo #HNL #Matchday', '09:00', 'match_day', ['#Dinamo', '#HNL', '#Matchday', '#Modri'], 'Kratki hype video: stadion, igraci, navijaci, tekst "SUBOTA 17:30"'),
      scheduled('7b', 'tiktok', 'video', 'Igrac priprema opremu', 'POV video igraca koji sprema opremu za utakmicu. Kopačke, dresovi, rutina.', 'POV: Pripremaš se za HNL utakmicu 👟⚽ #Dinamo #MatchPrep #Football #POV', '13:00', 'behind_scenes', ['#Dinamo', '#POV', '#Football', '#BTS'], 'POV kamera, close-up cipela, dresova, torbice, stadion u pozadini'),
      scheduled('7c', 'youtube', 'video', 'Taktički preview', 'Analitičar kluba objašnjava taktički pristup za subotnju utakmicu. Formacija, ključni igraci.', '🎯 TAKTIKA | Kako ćemo pristupiti subotnjoj utakmici? | Preview', '17:00', 'match_day', ['#Dinamo', '#Taktika', '#HNL', '#Preview'], 'Studio setup, taktička tabla, animirane formacije, split screen s isječcima'),
    ]],
    [8, [
      scheduled('8a', 'instagram', 'story', 'Matchday countdown', 'Story serija s countdownom do utakmice. Interaktivni stickeri i ankete.', '⏰ Još 5 sati! Tko ce zabiti prvi? Glasajte! 🔵', '12:00', 'match_day', ['#Dinamo', '#HNL'], 'Story s countdown stickerom, poll za prvog strijelca, quiz'),
      scheduled('8b', 'instagram', 'reel', 'Gol kompilacija sezone', 'Svi golovi Dinama ove sezone u jednom reelu. Epska montaza.', '⚽ SVAKI GOL ove sezone u 60 sekundi! 🔥🔵 Koji vam je najljepši? #Dinamo #Golovi #HNL', '20:00', 'match_day', ['#Dinamo', '#Golovi', '#HNL', '#Sezona'], '60s reel: brzi rezovi svih golova, brojač u kutu, energična glazba'),
      scheduled('8c', 'facebook', 'event', 'Gledanje utakmice — Zagreb', 'Organizirano zajedničko gledanje utakmice u centru Zagreba za navijače.', '📺 ZAJEDNO GLEDAMO! Pridružite nam se u Saturday Beer Gardenu! 🍻🔵 #Dinamo #Zajedno', '10:00', 'fan_engagement', ['#Dinamo', '#ZajednoGledamo', '#Zagreb'], 'Event poster s lokacijom, vremenom, logom kluba'),
    ]],
    [9, [
      scheduled('9a', 'instagram', 'carousel', 'Rezultat + highlights', 'Post-match carousel s rezultatom, najboljim trenucima i statistikama.', '✅ Još jedna pobjeda! Pogledajte highlights ➡️ #Dinamo #HNL #Pobjeda', '11:00', 'match_day', ['#Dinamo', '#HNL', '#Highlights'], '4-slide carousel: rezultat, best moments, statistike, sljedeca utakmica'),
      scheduled('9b', 'tiktok', 'video', 'Fan reakcije na pobjedu', 'Kompilacija reakcija navijaca iz cijele Hrvatske na golove Dinama.', '📱 Reakcije navijaca na pobjedu! 😂🔥 Ovo je ljubav prema klubu! #Dinamo #Reakcije #FYP', '18:00', 'fan_engagement', ['#Dinamo', '#Reakcije', '#FYP', '#BBB'], 'Split screen reakcija, glasne navijačke reakcije, sretni trenuci'),
    ]],
    [10, [
      scheduled('10a', 'instagram', 'reel', 'Trening freestyle', 'Igraci pokazuju freestyle trikove na treningu. Zabavan, viralan sadrzaj.', '🤹‍♂️ Freestyle na treningu! Tko je najbolji? 😂⚽ #Dinamo #Freestyle #Nogomet', '12:00', 'player_spotlight', ['#Dinamo', '#Freestyle', '#Trikovi'], 'Vertikalni format, slow motion trikovi, natjecanje izmedju igraca'),
      scheduled('10b', 'youtube', 'short', 'Akademija: Talent u fokusu', 'Profil mladog igraca iz akademije. Njegov put, snovi i ambicije.', '⭐ BUDUĆNOST je ovdje! Upoznajte našeg mladog talenta! #DinamoAkademija', '17:00', 'academy', ['#Dinamo', '#Akademija', '#MladiTalent'], 'Intervju format, trening kadrovi, statistike talenta'),
    ]],
    [11, [
      scheduled('11a', 'tiktok', 'video', 'Dan u zivotu: Kondicijski trener', 'Prateći kondicijskog trenera kroz radni dan. Od jutra do zadnjeg treninga.', '5:30 buđenje, 22:00 zavrsava trening... Dan u životu kondicijskog trenera 💪 #Dinamo #Fitness #DanUŽivotu', '09:00', 'behind_scenes', ['#Dinamo', '#DanUŽivotu', '#Fitness', '#FYP'], 'Vlog stil, time-lapse priprema, intenzivni treninzi, zavrsni shot s igracima'),
      scheduled('11b', 'instagram', 'post', 'Motivacijski citat', 'Citat trenera ili igraca na inspirativnoj pozadini stadiona.', '"Svaka utakmica je prilika da se pokažemo." — Trener 🔵💪 #Dinamo #Motivacija', '20:00', 'lifestyle', ['#Dinamo', '#Motivacija', '#Citat'], 'Tipografija na slici stadiona, plavi gradient, minimalistički dizajn'),
    ]],
    [12, [
      scheduled('12a', 'instagram', 'reel', 'Kit reveal: Gostujući dres', 'Otkrivanje novog gostujućeg dresa za sezonu 2026/27. Teaser video.', '👀 Nešto novo dolazi... 🔵⚪ Jeste li spremni? #Dinamo #NoviDres #2027', '18:00', 'lifestyle', ['#Dinamo', '#NoviDres', '#Kit', '#Reveal'], 'Teaser: zamucena slika dresa, ruke koje odmotavaju, dramska pauza, reveal'),
      scheduled('12b', 'facebook', 'post', '#OnThisDay: Povijesna pobjeda', 'Throwback na povijesnu pobjedu Dinama na danasnji datum. Nostalgicni sadrzaj.', '📅 #OnThisDay | Na današnji dan Dinamo je... 🔵🏆 Sjećate li se? #Dinamo #Povijest', '14:00', 'fan_engagement', ['#Dinamo', '#OnThisDay', '#Povijest'], 'Stara fotografija/video s modernim overlay-em, datum i rezultat'),
    ]],
    [13, [
      scheduled('13a', 'tiktok', 'video', 'Što igrači jedu', 'Nutricionistički plan igraca. Sto je na tanjuru profesionalnog nogometasa.', '🍽️ Što jede profesionalni nogometaš? Pogledajte jelovnik nasih igraca! #Dinamo #Hrana #Nogomet', '12:00', 'behind_scenes', ['#Dinamo', '#Hrana', '#Nutrition', '#FYP'], 'Close-up hrane, boja, nutritivne vrijednosti overlay, igrac objasnjava'),
      scheduled('13b', 'instagram', 'story', 'Kviz: Poznajes li Dinamo?', 'Interaktivni kviz u Stories formatu o povijesti i igracima kluba.', 'Koliko ZAISTA znaš o Dinamu? 🧠🔵 Testiraj se! #DinamoKviz', '17:00', 'fan_engagement', ['#Dinamo', '#Kviz'], 'Quiz stickeri, 5 pitanja o klubu, rezultati na kraju'),
    ]],
    [14, [
      scheduled('14a', 'instagram', 'carousel', 'Top 5 golova mjeseca', 'Carousel s 5 najljepsih golova Dinama ovog mjeseca. Glasanje u komentarima.', '🏆 TOP 5 golova ožujka! Koji je vaš br. 1? Glasajte u komentarima! ⬇️ #Dinamo #Golovi', '12:00', 'match_day', ['#Dinamo', '#Top5', '#Golovi', '#Ozujak'], '5-slide carousel: svaki slajd jedan gol s brojem i kratkim opisom'),
      scheduled('14b', 'tiktok', 'video', 'Igrac vs navijac: Penalty challenge', 'Igrac Dinama protiv navijaca u penalty izazovu. Zabavan interaktivni sadrzaj.', '⚽ PENALTY CHALLENGE! Igrac vs Navijac! Tko pobjeđuje? 😂 #Dinamo #Challenge #Penalty', '18:00', 'fan_engagement', ['#Dinamo', '#PenaltyChallenge', '#FYP'], 'Split screen, reakcije, polagani replay, zabavan komentar'),
      scheduled('14c', 'youtube', 'video', 'Subotnja najava + preview', 'Detaljan preview subotnje HNL utakmice. Forma, statistike, kljucni igraci.', '🎯 PREVIEW | Sve sto trebate znati prije subotnje utakmice! ⚽🔵', '17:00', 'match_day', ['#Dinamo', '#HNL', '#Preview'], 'Studijski format, grafike statistika, isjecci s proslih utakmica'),
    ]],
    [15, [
      scheduled('15a', 'instagram', 'reel', 'Matchday hype', 'Epski hype video za sutrašnju utakmicu. Igraci, navijaci, stadion.', '🔥 SUTRA. MAKSIMIR. HNL. Budite glasni! 🏟️🔵 #Dinamo #Matchday #HNL', '20:00', 'match_day', ['#Dinamo', '#HNL', '#Matchday', '#Hype'], 'Cinematic slow-mo: igraci ulaze na teren, tribine pune, baklje, zvuk navijaca'),
      scheduled('15b', 'facebook', 'event', 'HNL: Dinamo vs Osijek', 'Event za sutrašnju utakmicu. Informacije o kartama, prijevozu i atmosferi.', '🎫 HNL | Dinamo vs Osijek | Subota 17:30 | Maksimir 🏟️ Vidimo se! #Dinamo', '10:00', 'match_day', ['#Dinamo', '#HNL', '#DinamoOsijek'], 'Event cover s matchday grafikom, info o kartama'),
    ]],
    [16, [
      scheduled('16a', 'instagram', 'reel', 'Post-match celebration', 'Slavlje nakon pobjede. Igraci s navijacima, zagrljaji, veselje.', '🎉 TRI BODA! Slavlje s navijačima! 🔵💙 #Dinamo #Pobjeda #HNL', '20:00', 'match_day', ['#Dinamo', '#Pobjeda', '#Slavlje'], 'Emotivni kadrovi slavlja, igraci trcati prema tribinama, zagrljaji'),
      scheduled('16b', 'tiktok', 'video', 'Locker room vibes', 'Atmosfera u svlacionici nakon pobjede. Muzika, ples, slavlje.', '🎵 Svlačionica AFTER pobjede! Vibes su na drugom nivou! 🔵🕺 #Dinamo #LockerRoom #FYP', '22:00', 'behind_scenes', ['#Dinamo', '#LockerRoom', '#Vibes', '#FYP'], 'Handheld kamera, glazba, igraci plešu, spontani trenuci'),
    ]],
    [17, [
      scheduled('17a', 'youtube', 'video', 'Extended highlights', 'Produzeni highlights utakmice. 10 minuta najboljih akcija.', 'HIGHLIGHTS | Dinamo vs Osijek | HNL 2025/26 ⚽', '11:00', 'match_day', ['#Dinamo', '#HNL', '#Highlights'], 'Full HD highlights, vise kutova, atmosfera, komentator'),
      scheduled('17b', 'instagram', 'carousel', 'Player ratings', 'Ocjene igraca nakon utakmice s kratkim komentarima za svakog.', '📊 Ocjene igraca! Slažete li se? Koji igrac zasluzuje 10? ⬇️ #Dinamo #Ocjene', '15:00', 'match_day', ['#Dinamo', '#Ocjene', '#HNL'], 'Carousel: svaki igrac s ocjenom i kratkim opisom, plava tema'),
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
      scheduled('20a', 'instagram', 'carousel', 'Zagreb x Dinamo', 'Foto serija: igraci na ikonicnim lokacijama u Zagrebu. Lifestyle sadrzaj.', '🏙️ Zagreb 🤝 Dinamo | Grad i klub, nerazdvojni! 📸 #Dinamo #Zagreb #Lifestyle', '12:00', 'lifestyle', ['#Dinamo', '#Zagreb', '#Grad', '#Lifestyle'], 'Profesionalne fotografije igraca ispred katedrale, Trga, Jaruna'),
      scheduled('20b', 'tiktok', 'video', 'Guess the player: Childhood', 'Igra pogadjanja igraca po djecjim fotografijama. Viralni format.', '👶 Pogodite igrača po DJEČJOJ fotki! 😂 Zadnja ce vas šokirati! #Dinamo #GuessThePlayer #FYP', '18:00', 'player_spotlight', ['#Dinamo', '#GuessThePlayer', '#FYP', '#Zabava'], 'Blur reveal format, djecje fotke pa adult reveal, reakcije igraca'),
      scheduled('20c', 'youtube', 'short', 'Fan token ekskluziva', 'Ekskluzivni sadrzaj za Socios fan token holdere. Behind-the-scenes pristup.', '🪙 EKSKLUZIVNO za Fan Token holdere! Iza kulisa europske noci! #Dinamo #Socios', '20:00', 'fan_engagement', ['#Dinamo', '#Socios', '#FanToken'], 'Ekskluzivni behind-the-scenes, watermark "FAN TOKEN EXCLUSIVE"'),
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
      scheduled('23b', 'tiktok', 'video', 'Best fan moments: Derbi', 'Kompilacija najljepsih navijackih momenata s derbija. UGC content.', '💙 NAVIJACI NA DERBIJU! Ovo je BBB! 🔵🔥 Tagajte se! #Dinamo #BBB #Derbi #FYP', '18:00', 'fan_engagement', ['#Dinamo', '#BBB', '#Derbi', '#FYP'], 'UGC kompilacija, razliciti kutovi navijaca, emotivni trenuci, slavlje'),
    ]],
    [24, [
      scheduled('24a', 'instagram', 'reel', 'Week recap', 'Tjedni pregled: najbolji trenuci iz treninga, utakmice i iza kulisa.', '📅 Tjedan u Dinamu! Derbi pobjeda, trening, i vise! 🔵✨ #Dinamo #TjedniPregled', '17:00', 'behind_scenes', ['#Dinamo', '#TjedniPregled', '#Recap'], 'Montaza tjedna: trening, derbi, slavlje, opusteni trenuci'),
      scheduled('24b', 'facebook', 'post', 'Zahvala navijacima', 'Post zahvale navijacima za fenomenalnu podrsku na derbiju. Community post.', '💙 HVALA! 40.000 navijaca na derbiju! Vi ste naš 12. igrač! 🏟️🔵 #Dinamo #Hvala #BBB', '10:00', 'fan_engagement', ['#Dinamo', '#Hvala', '#BBB', '#12Igrač'], 'Panoramska fotografija punog stadiona, "HVALA" tekst overlay'),
    ]],
    [25, [
      scheduled('25a', 'tiktok', 'video', 'Gym session: Snaga i izdržljivost', 'Treninzi snage u teretani. Igraci dizu utege, rade vježbe eksplozivnosti.', '🏋️ GYM DAY! Kako se gradi Dinamo snaga! 💪🔵 #Dinamo #Gym #Fitness #FYP', '09:00', 'behind_scenes', ['#Dinamo', '#Gym', '#Fitness', '#Snaga', '#FYP'], 'Teretana kadrovi, close-up dizanja, znojenje, motivacijska glazba'),
      scheduled('25b', 'instagram', 'carousel', 'Akademija spotlight', 'Profili 3 mlada igraca iz akademije. Statistike, pozicija, potencijal.', '⭐ AKADEMIJA SPOTLIGHT | 3 talenta koja morate pratiti! 🔵 #DinamoAkademija #Talenti', '15:00', 'academy', ['#Dinamo', '#Akademija', '#MladiTalenti', '#Buducnost'], 'Profesionalne fotke mladih igraca, statistike, kratke bio informacije'),
    ]],
    [26, [
      scheduled('26a', 'instagram', 'reel', 'City walk: Zagreb sa igracima', 'Igraci setaju Zagrebom, posjete omiljene restorane, kafice. Lifestyle sadrzaj.', '🏙️ Zagreb kroz oči naših igrača! 📸☕ Gdje se vole opustiti? #Dinamo #Zagreb #Lifestyle', '12:00', 'lifestyle', ['#Dinamo', '#Zagreb', '#Lifestyle', '#CityWalk'], 'Vlog stil, igraci u casual odjeci, zagrebacke ulice, kafici, hrana'),
      scheduled('26b', 'youtube', 'video', 'Sezonski recap (do sad)', 'Pregled sezone do sad: rezultati, najbolji momenti, statistike, put do cilja.', '📊 SEZONA 2025/26 — DO SAD! | Sve sto trebate znati! ⚽🔵', '18:00', 'match_day', ['#Dinamo', '#Sezona', '#HNL', '#Recap'], 'Montaza sezone: golovi, slavlja, tablica, put do naslova'),
    ]],
    [27, [
      scheduled('27a', 'tiktok', 'video', 'Igrac odgovara na komentare', 'Igrac cita i odgovara na komentare navijaca. Smijesno i iskreno.', '💬 Čitamo VAŠE komentare! 😂 Igrac reagira! #Dinamo #Komentari #React #FYP', '17:00', 'fan_engagement', ['#Dinamo', '#Komentari', '#React', '#FYP'], 'Selfie kamera, igrac cita telefon, reakcije, smijeh'),
      scheduled('27b', 'instagram', 'post', 'Petak motivacija', 'Motivacijski post za kraj tjedna. Fokus na subotnju utakmicu.', '💪 "Svaki dan je prilika da budemo bolji." — Fokus na sutra! 🔵⚡ #Dinamo #Motivacija', '20:00', 'lifestyle', ['#Dinamo', '#Motivacija', '#Fokus'], 'Cinematic fotografija s treninga, quote overlay, plavi ton'),
    ]],
    [28, [
      scheduled('28a', 'instagram', 'reel', 'Matchday: HNL', 'Najava subotnje HNL utakmice. Stadion, igraci, navijaci.', '🏟️ MATCHDAY! HNL | Danas igramo za vas! 🔵⚽ #Dinamo #HNL #Matchday', '10:00', 'match_day', ['#Dinamo', '#HNL', '#Matchday'], 'Hype video: budjenje igraca, put na stadion, ulazak u tunel'),
      scheduled('28b', 'tiktok', 'video', 'Walk out tunnel cam', 'POV izlazak iz tunela na teren. Zvuk navijaca, svjetla, adrenalin.', '🚶‍♂️ POV: Izlaziš iz tunela na Maksimiru! 😱🏟️ #Dinamo #TunnelCam #POV #FYP', '17:00', 'match_day', ['#Dinamo', '#TunnelCam', '#POV', '#Matchday'], 'GoPro na prsima igraca, tunel → teren, zvuk navijaca eksplodira'),
      scheduled('28c', 'facebook', 'post', 'FT rezultat', 'Rezultat i kratki pregled utakmice.', '⚽ ZAVRŠENO! Dinamo pobjeđuje! 🔵🏆 #Dinamo #HNL #Pobjeda', '19:30', 'match_day', ['#Dinamo', '#HNL', '#Pobjeda'], 'Rezultatska grafika, slavlje igraca'),
    ]],
    [29, [
      scheduled('29a', 'youtube', 'video', 'Full match highlights', 'Produzeni highlights subotnje utakmice. Svi golovi i najbolje akcije.', 'HIGHLIGHTS | Dinamo | HNL 2025/26 | Matchday ⚽🔵', '11:00', 'match_day', ['#Dinamo', '#HNL', '#Highlights'], 'Full HD, vise kutova, atmosfera'),
      scheduled('29b', 'instagram', 'carousel', 'Nedjeljna regeneracija', 'Fotografije igraca na regeneraciji. Bazeni, masaze, istezanje.', '🧘 Nedjelja = Oporavak! Tijelo i um se pripremaju za novo! 🔵💆‍♂️ #Dinamo #Recovery', '14:00', 'behind_scenes', ['#Dinamo', '#Recovery', '#Regeneracija'], 'Fotografije: ledeni bazen, masaza, yoga, opustena atmosfera'),
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
  { id: '1', title: 'Najava utakmice: Dinamo vs Hajduk', platform: 'Instagram Reel', author: 'Tim za sadrzaj', submitted: 'prije 2 sata', pillar: 'Dan utakmice' },
  { id: '2', title: 'Akademija u fokusu: Highlights omladinskog kupa', platform: 'TikTok video', author: 'Mediji akademije', submitted: 'prije 5 sati', pillar: 'Akademija' },
  { id: '3', title: 'Fan Q&A s Petkovicem', platform: 'YouTube Short', author: 'Odnosi s igracima', submitted: 'prije 1 dan', pillar: 'Igraci' },
  { id: '4', title: 'Iza kulisa: Trening', platform: 'Instagram karusel', author: 'Tim za sadrzaj', submitted: 'prije 1 dan', pillar: 'Iza kulisa' },
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
  match_day: 'bg-red-100 text-red-700',
  player_spotlight: 'bg-blue-100 text-blue-700',
  behind_scenes: 'bg-amber-100 text-amber-700',
  academy: 'bg-green-100 text-green-700',
  fan_engagement: 'bg-purple-100 text-purple-700',
  diaspora: 'bg-cyan-100 text-cyan-700',
  european_nights: 'bg-indigo-100 text-indigo-700',
  lifestyle: 'bg-pink-100 text-pink-700',
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

type ViewMode = 'month' | 'week' | 'sixmonth'
type TabMode = 'calendar' | 'approvals'

export default function ContentCalendar() {
  const [activeTab, setActiveTab] = useState<TabMode>('calendar')
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentMonth, setCurrentMonth] = useState(2) // March 2026 (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<Record<number, Post[]> | null>(null)

  const queue = fallbackQueue

  const calendarData = generatedData || fallbackCalendar

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
      const res = await contentApi.generateAIPlan({ month: currentMonth + 1, year: currentYear })
      const posts = res.data?.posts
      if (Array.isArray(posts) && posts.length > 0) {
        // Group posts by day
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
            status: 'draft',
          })
        }
        setGeneratedData(grouped)
      }
    } catch {
      // Keep existing data on error
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async (id: string) => {
    try { await contentApi.approvePost(id) } catch { /* fallback */ }
  }

  const handleReject = async (id: string) => {
    try { await contentApi.rejectPost(id, 'Odbijeno') } catch { /* fallback */ }
  }

  const selectedDayPosts = selectedDay ? (calendarData[selectedDay] || []) : []

  const totalPosts = Object.values(calendarData).reduce((sum, posts) => sum + posts.length, 0)
  const daysWithContent = Object.keys(calendarData).length

  return (
    <div className="animate-fade-in">
      <Header
        title="KALENDAR SADRZAJA"
        subtitle={`${monthNames[currentMonth]} ${currentYear} — Planiranje i odobrenja`}
        actions={
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Generiranje...' : 'AI Generiraj plan'}
          </button>
        }
      />

      <div className="page-wrapper space-y-6">
        {/* Tabs + View Mode */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 border-b border-gray-200 pb-1">
            <button onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-dinamo-accent text-dinamo-accent-dark' : 'border-transparent text-dinamo-muted hover:text-gray-700'}`}>
              <Calendar size={16} className="inline mr-2" />Kalendar
            </button>
            <button onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'approvals' ? 'border-dinamo-accent text-dinamo-accent-dark' : 'border-transparent text-dinamo-muted hover:text-gray-700'}`}>
              <Clock size={16} className="inline mr-2" />Red za odobrenje
              <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">{queue.length}</span>
            </button>
          </div>

          {activeTab === 'calendar' && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-dinamo-muted">
                <BarChart3 size={14} />
                <span>{totalPosts} objava</span>
                <span>·</span>
                <span>{daysWithContent}/{daysInMonth} dana</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {([['month', LayoutGrid, 'Mjesec'], ['week', List, 'Tjedan'], ['sixmonth', CalendarDays, '6 mjeseci']] as const).map(([mode, Icon, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-dinamo-muted hover:text-gray-700'}`}>
                    <Icon size={14} /><span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Generating overlay */}
        {generating && (
          <div className="card flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 size={40} className="animate-spin text-dinamo-accent mx-auto" />
              <p className="text-lg font-medium text-gray-900">Gemini AI generira plan...</p>
              <p className="text-sm text-dinamo-muted">Analizira Dinamov sadržaj i kreira kvalitetne ideje za {monthNames[currentMonth]}</p>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && viewMode === 'month' && !generating && (
          <div className="flex gap-6">
            {/* Calendar Grid */}
            <div className={`card flex-1 ${selectedDay ? 'lg:flex-[2]' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 text-dinamo-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold text-gray-900">{monthNames[currentMonth].toUpperCase()} {currentYear}</h2>
                <button onClick={nextMonth} className="p-2 text-dinamo-muted hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={20} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="text-center text-xs text-dinamo-muted font-medium py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDayOffset + 1
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth
                  const isToday = dayNum === todayDay
                  const isSelected = dayNum === selectedDay
                  const isPast = isValid && isCurrentMonth && dayNum < todayDay
                  const posts = isValid ? (calendarData[dayNum] || []) : []

                  return (
                    <div key={i} onClick={() => isValid && setSelectedDay(isSelected ? null : dayNum)}
                      className={`min-h-[72px] sm:min-h-[80px] p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected ? 'border-dinamo-accent bg-dinamo-accent/5 ring-1 ring-dinamo-accent/20'
                        : isToday ? 'border-blue-400 bg-blue-50'
                        : isPast ? 'border-gray-200 bg-gray-50/50'
                        : isValid ? 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                        : 'border-transparent bg-transparent cursor-default'
                      }`}>
                      {isValid && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isToday ? 'text-blue-600 font-bold' : isSelected ? 'text-dinamo-accent-dark' : isPast ? 'text-gray-400' : 'text-gray-600'}`}>
                              {dayNum}
                            </span>
                            {posts.length > 0 && (
                              <span className={`text-[10px] font-mono ${posts.length >= 3 ? 'text-green-600 font-bold' : 'text-dinamo-muted'}`}>{posts.length}</span>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {posts.slice(0, 4).map((post) => (
                              <div key={post.id}
                                className={`w-2.5 h-2.5 rounded-full ${platformColors[post.platform] || 'bg-gray-400'} ${isPast ? 'opacity-60' : ''} transition-transform hover:scale-125`}
                                title={`${post.platform} - ${post.type}`} />
                            ))}
                            {posts.length > 4 && <span className="text-[10px] text-dinamo-muted">+{posts.length - 4}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 flex-wrap">
                <span className="text-xs text-dinamo-muted">Platforme:</span>
                {Object.entries(platformColors).slice(0, 4).map(([platform, color]) => (
                  <div key={platform} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs text-dinamo-muted capitalize">{platform}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Detail Panel */}
            {selectedDay && (
              <div className="hidden lg:block card w-96 animate-slide-in max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedDay}. {monthNames[currentMonth]}</h3>
                    <p className="text-xs text-dinamo-muted">{dayNames[new Date(currentYear, currentMonth, selectedDay).getDay()]}</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded"><X size={16} className="text-dinamo-muted" /></button>
                </div>

                {selectedDayPosts.length === 0 ? (
                  <p className="text-sm text-dinamo-muted py-8 text-center">Nema objava za ovaj dan</p>
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
                              <span className="text-xs font-medium text-gray-600 capitalize">{post.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dinamo-muted">{post.scheduled_time}</span>
                              {post.status === 'published' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Objavljeno</span>}
                              {post.status === 'scheduled' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Zakazano</span>}
                              {post.status === 'draft' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Draft</span>}
                              {post.status === 'missed' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Propušteno</span>}
                            </div>
                          </div>

                          {/* Title */}
                          <p className="text-sm text-gray-900 font-medium">{post.title}</p>

                          {/* Pillar tag */}
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${pillarColors[post.content_pillar] || 'bg-gray-100 text-gray-600'}`}>
                            {pillarLabels[post.content_pillar] || post.content_pillar}
                          </span>

                          {/* Metrics for published posts */}
                          {isPast && post.metrics && (
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                              <span className="text-xs text-dinamo-muted flex items-center gap-1"><Eye size={11} /> {formatNumber(post.metrics.views)}</span>
                              <span className="text-xs text-dinamo-muted flex items-center gap-1"><Heart size={11} /> {formatNumber(post.metrics.likes)}</span>
                              <span className="text-xs text-dinamo-muted flex items-center gap-1"><MessageCircle size={11} /> {formatNumber(post.metrics.comments)}</span>
                              <span className={`text-xs font-bold ${post.metrics.engagement_rate > 5 ? 'text-green-600' : 'text-gray-500'}`}>{post.metrics.engagement_rate}%</span>
                            </div>
                          )}

                          {/* Description for future posts */}
                          {!isPast && post.description && (
                            <p className="text-xs text-dinamo-muted mt-1 line-clamp-2">{post.description}</p>
                          )}

                          {/* Hashtags preview */}
                          {!isPast && post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {post.hashtags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] text-blue-500">{tag}</span>
                              ))}
                              {post.hashtags.length > 3 && <span className="text-[10px] text-dinamo-muted">+{post.hashtags.length - 3}</span>}
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
        )}

        {activeTab === 'calendar' && viewMode === 'sixmonth' && !generating && (
          <div className="card">
            <h2 className="section-title mb-6">6-Mjesecni pregled plana</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }, (_, i) => {
                const m = (currentMonth + i) % 12
                const y = currentYear + Math.floor((currentMonth + i) / 12)
                return (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-dinamo-accent/30 transition-colors cursor-pointer"
                    onClick={() => { setCurrentMonth(m); setCurrentYear(y); setViewMode('month') }}>
                    <p className="text-sm font-medium text-gray-900">{monthNames[m]}</p>
                    <p className="text-xs text-dinamo-muted">{y}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-dinamo-muted">Objave</span>
                        <span className="text-gray-700 font-mono">{i === 0 ? totalPosts : '—'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && viewMode === 'week' && !generating && (
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
                      <p className="text-xs text-dinamo-muted">{day}</p>
                      <p className={`text-lg font-bold ${dayNum === todayDay ? 'text-blue-600' : 'text-gray-900'}`}>{dayNum > 0 && dayNum <= daysInMonth ? dayNum : '—'}</p>
                    </div>
                    <div className="flex-1 flex gap-2 flex-wrap">
                      {posts.map((post) => (
                        <div key={post.id} onClick={() => setSelectedPost(post)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                          <PlatformIcon platform={post.platform} size="sm" />
                          <span className="text-xs text-gray-700">{post.title || post.type}</span>
                          {isPast && post.metrics && <span className="text-[10px] text-green-600 font-bold">{post.metrics.engagement_rate}%</span>}
                        </div>
                      ))}
                      {posts.length === 0 && <span className="text-xs text-dinamo-muted italic">Nema objava</span>}
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">{item.pillar}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-dinamo-muted">
                      <span>{item.platform}</span><span>|</span><span>{item.author}</span><span>|</span><span>{item.submitted}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors">
                      <Check size={14} />Odobri
                    </button>
                    <button onClick={() => handleReject(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs rounded-lg border border-red-300 transition-colors">
                      <X size={14} />Odbij
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POST DETAIL MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={selectedPost.platform} size="md" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedPost.title}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-dinamo-muted capitalize">{selectedPost.type}</span>
                    <span className="text-xs text-dinamo-muted">·</span>
                    <span className="text-xs text-dinamo-muted">{selectedPost.scheduled_time}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${pillarColors[selectedPost.content_pillar] || 'bg-gray-100 text-gray-600'}`}>
                      {pillarLabels[selectedPost.content_pillar] || selectedPost.content_pillar}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Status banner */}
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
                selectedPost.status === 'published' ? 'bg-green-50 border border-green-200' :
                selectedPost.status === 'scheduled' ? 'bg-blue-50 border border-blue-200' :
                selectedPost.status === 'draft' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-red-50 border border-red-200'
              }`}>
                {selectedPost.status === 'published' && <><Check size={16} className="text-green-600" /><span className="text-sm text-green-700 font-medium">Objavljeno u {selectedPost.scheduled_time}</span></>}
                {selectedPost.status === 'scheduled' && <><Clock size={16} className="text-blue-600" /><span className="text-sm text-blue-700 font-medium">Zakazano za {selectedPost.scheduled_time}</span></>}
                {selectedPost.status === 'draft' && <><Sparkles size={16} className="text-yellow-600" /><span className="text-sm text-yellow-700 font-medium">AI generirani draft</span></>}
                {selectedPost.status === 'missed' && <><X size={16} className="text-red-600" /><span className="text-sm text-red-700 font-medium">Propuštena objava</span></>}
              </div>

              {/* Metrics for published */}
              {selectedPost.metrics && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><BarChart3 size={16} /> Performanse</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Pregledi', value: selectedPost.metrics.views, icon: Eye },
                        { label: 'Doseg', value: selectedPost.metrics.reach, icon: Target },
                        { label: 'Prikazivanja', value: selectedPost.metrics.impressions, icon: Zap },
                        { label: 'Angažman', value: selectedPost.metrics.engagement_rate, icon: TrendingUp, suffix: '%' },
                        { label: 'Lajkovi', value: selectedPost.metrics.likes, icon: Heart },
                        { label: 'Komentari', value: selectedPost.metrics.comments, icon: MessageCircle },
                        { label: 'Dijeljenja', value: selectedPost.metrics.shares, icon: Share2 },
                        { label: 'Spremljeno', value: selectedPost.metrics.saves, icon: Bookmark },
                      ].map(({ label, value, icon: Icon, suffix }) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-dinamo-muted mb-1">
                            <Icon size={12} />
                            <span className="text-xs">{label}</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">{suffix ? value + suffix : formatNumber(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comparison with last week */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Usporedba s prošlim tjednom</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(() => {
                        const viewsChange = pctChange(selectedPost.metrics!.views, selectedPost.metrics!.prev_week_avg_views)
                        const engChange = pctChange(selectedPost.metrics!.engagement_rate, selectedPost.metrics!.prev_week_avg_engagement)
                        return [
                          { label: 'Pregledi vs prosjek', pct: viewsChange.pct, up: viewsChange.up, current: formatNumber(selectedPost.metrics!.views), prev: formatNumber(selectedPost.metrics!.prev_week_avg_views) },
                          { label: 'Angažman vs prosjek', pct: engChange.pct, up: engChange.up, current: selectedPost.metrics!.engagement_rate + '%', prev: selectedPost.metrics!.prev_week_avg_engagement + '%' },
                        ].map(({ label, pct, up, current, prev }) => (
                          <div key={label} className={`rounded-lg p-3 border ${up ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-xs text-dinamo-muted mb-1">{label}</p>
                            <div className="flex items-center gap-2">
                              {up ? <TrendingUp size={16} className="text-green-600" /> : <TrendingDown size={16} className="text-red-600" />}
                              <span className={`text-lg font-bold ${up ? 'text-green-700' : 'text-red-700'}`}>{pct}</span>
                            </div>
                            <p className="text-xs text-dinamo-muted mt-1">{current} vs {prev} prosjek</p>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </>
              )}

              {/* Caption */}
              {selectedPost.caption_hr && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{selectedPost.metrics ? 'Caption' : 'Predloženi caption'}</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{selectedPost.caption_hr}</p>
                </div>
              )}

              {/* Description (for future/draft) */}
              {!selectedPost.metrics && selectedPost.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Opis ideje</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{selectedPost.description}</p>
                </div>
              )}

              {/* Visual brief */}
              {selectedPost.visual_brief && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Vizualni smjer</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedPost.visual_brief}</p>
                </div>
              )}

              {/* Hashtags */}
              {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.hashtags.map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
