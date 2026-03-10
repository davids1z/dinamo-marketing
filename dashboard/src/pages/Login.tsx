import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Mail, KeyRound } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Neispravni podaci za prijavu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-studio-base flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-dinamo-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-studio-ai-purple/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-dinamo-accent mx-auto flex items-center justify-center mb-5 shadow-lg shadow-dinamo-accent/20">
            <span className="font-headline text-2xl text-dinamo-primary font-bold">S1Z</span>
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
            <h2 className="font-headline text-lg text-studio-text-primary">Prijava</h2>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-studio-text-secondary mb-1.5">E-mail adresa</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-dinamo-accent/50 focus:ring-2 focus:ring-dinamo-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
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
                  className="w-full pl-10 pr-4 py-3 border border-studio-border rounded-xl focus:outline-none focus:border-dinamo-accent/50 focus:ring-2 focus:ring-dinamo-accent/10 text-sm text-studio-text-primary bg-studio-surface-0 transition-all placeholder-studio-text-tertiary"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-dinamo-accent hover:bg-dinamo-accent-hover text-dinamo-primary font-bold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md shadow-dinamo-accent/20 hover:shadow-lg hover:shadow-dinamo-accent/30 active:scale-[0.98]"
            >
              {loading ? 'Prijava...' : 'Prijavi se'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-studio-text-tertiary mt-8">ShiftOneZero</p>
      </div>
    </div>
  )
}
