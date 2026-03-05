import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  Radio,
  Users,
  Heart,
  CalendarDays,
  Megaphone,
  BarChart3,
  MessageCircle,
  Ear,
  GraduationCap,
  MapPin,
  FileText,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Nadzorna ploča', href: '/', icon: LayoutDashboard },
  { name: 'Istraživanje tržišta', href: '/market-research', icon: Globe },
  { name: 'Audit kanala', href: '/channels', icon: Radio },
  { name: 'Konkurencija', href: '/competitors', icon: Users },
  { name: 'Uvidi o navijačima', href: '/fans', icon: Heart },
  { name: 'Kalendar sadržaja', href: '/content', icon: CalendarDays },
  { name: 'Kampanje', href: '/campaigns', icon: Megaphone },
  { name: 'Analitika', href: '/analytics', icon: BarChart3 },
  { name: 'Sentiment', href: '/sentiment', icon: MessageCircle },
  { name: 'Social listening', href: '/social-listening', icon: Ear },
  { name: 'Akademija', href: '/academy', icon: GraduationCap },
  { name: 'Dijaspora', href: '/diaspora', icon: MapPin },
  { name: 'Izvještaji', href: '/reports', icon: FileText },
  { name: 'Postavke', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-dinamo-dark-light border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-dinamo-accent flex items-center justify-center">
            <span className="font-headline text-lg text-white font-bold">D</span>
          </div>
          <div>
            <h1 className="font-headline text-xl tracking-wider text-white leading-none font-bold">
              DINAMO
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-dinamo-accent">
              Marketing Platforma
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-dinamo-accent/15 text-dinamo-accent border-l-2 border-dinamo-accent'
                      : 'text-dinamo-muted hover:text-white hover:bg-white/5'
                  )
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-dinamo-muted">Mock način aktivan</span>
        </div>
      </div>
    </aside>
  )
}
