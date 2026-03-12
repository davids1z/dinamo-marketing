import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, KeyRound, User, Building2 } from 'lucide-react'
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
    <div className="min-h-screen bg-studio-base flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-studio-ai-purple/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent mx-auto flex items-center justify-center mb-5 shadow-lg shadow-brand-accent/20">
            <span className="font-headline text-2xl text-brand-primary font-bold">S1Z</span>
          </div>
          <h1 className="font-headline text-3xl tracking-wider text-studio-text-primary font-bold">SHIFTONEZERO</h1>
          <p className="text-sm uppercase tracking-[0.25em] text-studio-text-tertiary mt-1.5 font-medium">Marketing Platforma</p>
        </div>

        {/* Form card */}
        <div className="bg-studio-surface-1 rounded-3xl p-8 shadow-studio-canvas border border-studio-border">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-studio-surface-3 flex items-center justify-center">
              <Lock className="w-4 h-4 text-studio-text-secondary" />
            </div>
            <h2 className="font-headline text-lg text-studio-text-primary">Registracija</h2>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Ime i prezime</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-tertiary" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
                  placeholder="Ivan Horvat"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Naziv tvrtke</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-tertiary" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
                  placeholder="Moja Tvrtka d.o.o."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">E-mail adresa</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
                  placeholder="email@primjer.hr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Lozinka</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-tertiary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
                  placeholder="Minimalno 6 znakova"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">Potvrdi lozinku</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-tertiary" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-brand-primary font-bold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md shadow-brand-accent/20 hover:shadow-lg hover:shadow-brand-accent/30 active:scale-[0.98]"
            >
              {loading ? 'Registracija...' : 'Registriraj se'}
            </button>
          </form>

          <p className="text-center text-sm text-studio-text-tertiary mt-5">
            {'Već imate račun? '}
            <Link to="/login" className="text-brand-accent hover:underline font-medium">Prijavite se</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
