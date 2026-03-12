import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ClientProvider } from './contexts/ClientContext'
import { ProjectProvider } from './contexts/ProjectContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoleGuard from './components/auth/RoleGuard'
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
const ContentStudio = lazy(() => import('./pages/ContentStudio'))
const CampaignResearch = lazy(() => import('./pages/CampaignResearch'))
const BrandProfile = lazy(() => import('./pages/BrandProfile'))
const Register = lazy(() => import('./pages/Register'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ClientProvider>
        <ProjectProvider>
        <Routes>
          <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
          <Route path="/invite" element={<Suspense fallback={<PageLoader />}><InviteAccept /></Suspense>} />
          <Route path="/onboarding" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Onboarding /></Suspense></ProtectedRoute>} />
          <Route path="/studio/:postId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ContentStudio /></Suspense></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="market-research" element={<Suspense fallback={<PageLoader />}><MarketResearch /></Suspense>} />
            {/* Moderator+ routes */}
            <Route path="channels" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><ChannelAudit /></Suspense></RoleGuard>} />
            <Route path="competitors" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><Competitors /></Suspense></RoleGuard>} />
            <Route path="fans" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><FanInsights /></Suspense></RoleGuard>} />
            <Route path="content" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><ContentCalendar /></Suspense></RoleGuard>} />
            <Route path="campaigns" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><Campaigns /></Suspense></RoleGuard>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="sentiment" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><SentimentAnalysis /></Suspense></RoleGuard>} />
            <Route path="social-listening" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><SocialListening /></Suspense></RoleGuard>} />
            <Route path="diaspora" element={<RoleGuard requiredRole="moderator"><Suspense fallback={<PageLoader />}><Diaspora /></Suspense></RoleGuard>} />
            <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
            <Route path="brand-profile" element={<Suspense fallback={<PageLoader />}><BrandProfile /></Suspense>} />
            {/* Admin+ routes */}
            <Route path="academy" element={<RoleGuard requiredRole="admin"><Suspense fallback={<PageLoader />}><Academy /></Suspense></RoleGuard>} />
            <Route path="campaign-research" element={<RoleGuard requiredRole="admin"><Suspense fallback={<PageLoader />}><CampaignResearch /></Suspense></RoleGuard>} />
            <Route path="settings" element={<RoleGuard requiredRole="admin"><Suspense fallback={<PageLoader />}><Settings /></Suspense></RoleGuard>} />
            {/* Superadmin only */}
            <Route path="admin" element={<RoleGuard requiredRole="superadmin"><Suspense fallback={<PageLoader />}><Admin /></Suspense></RoleGuard>} />
          </Route>
        </Routes>
        </ProjectProvider>
      </ClientProvider>
    </AuthProvider>
  )
}
