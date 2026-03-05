import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import MarketResearch from './pages/MarketResearch'
import ChannelAudit from './pages/ChannelAudit'
import Competitors from './pages/Competitors'
import FanInsights from './pages/FanInsights'
import ContentCalendar from './pages/ContentCalendar'
import Campaigns from './pages/Campaigns'
import Analytics from './pages/Analytics'
import SentimentAnalysis from './pages/SentimentAnalysis'
import SocialListening from './pages/SocialListening'
import Academy from './pages/Academy'
import Diaspora from './pages/Diaspora'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="market-research" element={<MarketResearch />} />
        <Route path="channels" element={<ChannelAudit />} />
        <Route path="competitors" element={<Competitors />} />
        <Route path="fans" element={<FanInsights />} />
        <Route path="content" element={<ContentCalendar />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="sentiment" element={<SentimentAnalysis />} />
        <Route path="social-listening" element={<SocialListening />} />
        <Route path="academy" element={<Academy />} />
        <Route path="diaspora" element={<Diaspora />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
