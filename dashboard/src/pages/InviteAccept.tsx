import { useState, FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, Mail, KeyRound, User, UserPlus } from 'lucide-react'
import api from '../api/client'

export default function InviteAccept() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteToken) {
      setError('Nevažeći pozivni link')
      return
    }
    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 znakova')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/accept-invite', {
        token: inviteToken,
        email,
        password,
        full_name: fullName,
      })
      const { access_token, user } = res.data
      localStorage.setItem('auth_token', access_token)
      if (user.clients?.[0]) {
        localStorage.setItem('current_client_id', user.clients[0].client_id)
        if (user.clients[0].projects?.[0]) {
          localStorage.setItem('current_project_id', user.clients[0].projects[0].project_id)
        }
      }
      setSuccess(true)
      // Redirect after brief delay
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Greška pri prihvaćanju poziva')
    } finally {
      setLoading(false)
    }
  }

  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50 flex items-center justify-center px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, sans-serif', textTransform: 'none' }}>
            Nevažeći pozivni link
          </h2>
          <p className="text-sm text-slate-500">Ovaj link ne sadrži valjani pozivni token. Zatražite novi poziv od administratora.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50 flex items-center justify-center px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, sans-serif', textTransform: 'none' }}>
            Dobrodošli!
          </h2>
          <p className="text-sm text-slate-500">Poziv je prihvaćen. Preusmjeravamo vas na dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative arc lines */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] border border-sky-200/60 rounded-full pointer-events-none" />
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] border border-sky-200/40 rounded-full pointer-events-none" />

      {/* Bottom clouds */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none">
        <div className="absolute bottom-0 left-[10%] w-72 h-28 bg-white/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-[15%] w-80 h-24 bg-white/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-[40%] w-64 h-20 bg-white/40 rounded-full blur-2xl" />
      </div>

      {/* Logo top-left */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5 z-20">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
          <span className="font-headline text-xs text-white font-bold">S1Z</span>
        </div>
        <span className="font-headline text-base tracking-wider text-slate-800 font-bold">SHIFTONEZERO</span>
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50">
          {/* Card icon + title */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <UserPlus className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Inter, sans-serif', textTransform: 'none' }}>
              Prihvatite poziv
            </h2>
            <p className="text-sm text-slate-500 mt-1">Pridružite se timu</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm text-slate-900 transition-all placeholder-slate-400"
                placeholder="Ime i prezime"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm text-slate-900 transition-all placeholder-slate-400"
                placeholder="E-mail adresa"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm text-slate-900 transition-all placeholder-slate-400"
                placeholder="Lozinka (min. 6 znakova)"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-1"
            >
              {loading ? 'Prihvaćam...' : 'Prihvati poziv'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
