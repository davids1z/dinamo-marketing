import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MarketResearch = lazy(() => import('./pages/MarketResearch'))
const ChannelAudit = lazy(() => import('./pages/ChannelAudit'))
const Competitors = lazy(() => import('./pages/Competitors'))
const FanInsights = lazy(() => import('./pages/FanInsights'))
const ContentCalendar = lazy(() => import('./pages/ContentCalendar'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Analytics = lazy(() => import('./pages/Analytics'))
const SentimentAnalysis = lazy(() => import('./pages/SentimentAnalysis'))
const SocialListening = lazy(() => import('./pages/SocialListening'))
const Academy = lazy(() => import('./pages/Academy'))
const Diaspora = lazy(() => import('./pages/Diaspora'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-dinamo-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="market-research" element={<Suspense fallback={<PageLoader />}><MarketResearch /></Suspense>} />
          <Route path="channels" element={<Suspense fallback={<PageLoader />}><ChannelAudit /></Suspense>} />
          <Route path="competitors" element={<Suspense fallback={<PageLoader />}><Competitors /></Suspense>} />
          <Route path="fans" element={<Suspense fallback={<PageLoader />}><FanInsights /></Suspense>} />
          <Route path="content" element={<Suspense fallback={<PageLoader />}><ContentCalendar /></Suspense>} />
          <Route path="campaigns" element={<Suspense fallback={<PageLoader />}><Campaigns /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
          <Route path="sentiment" element={<Suspense fallback={<PageLoader />}><SentimentAnalysis /></Suspense>} />
          <Route path="social-listening" element={<Suspense fallback={<PageLoader />}><SocialListening /></Suspense>} />
          <Route path="academy" element={<Suspense fallback={<PageLoader />}><Academy /></Suspense>} />
          <Route path="diaspora" element={<Suspense fallback={<PageLoader />}><Diaspora /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
