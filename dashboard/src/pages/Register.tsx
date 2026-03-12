import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Mail, KeyRound, User, Building2 } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju')
      return
    }
    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 znakova')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        company_name: companyName,
      })
      const { access_token, user } = res.data
      // Store token and user data
      localStorage.setItem('auth_token', access_token)
      if (user.clients?.[0]) {
        localStorage.setItem('current_client_id', user.clients[0].client_id)
        if (user.clients[0].projects?.[0]) {
          localStorage.setItem('current_project_id', user.clients[0].projects[0].project_id)
        }
      }
      // Login to update auth context, then navigate
      await login(email, password)
      navigate('/onboarding')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Greška pri registraciji')
    } finally {
      setLoading(false)
    }
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

      {/* Card */}
      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50">
          {/* Card icon + title */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <UserPlus className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Inter, sans-serif', textTransform: 'none' }}>
              Kreirajte račun
            </h2>
            <p className="text-sm text-slate-500 mt-1">Započnite s AI marketingom</p>
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
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm text-slate-900 transition-all placeholder-slate-400"
                placeholder="Naziv tvrtke"
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
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm text-slate-900 transition-all placeholder-slate-400"
                placeholder="Potvrdi lozinku"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-1"
            >
              {loading ? 'Registracija...' : 'Registriraj se'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {'Već imate račun? '}
            <Link to="/login" className="text-sky-600 hover:text-sky-700 font-medium hover:underline">
              Prijavite se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
