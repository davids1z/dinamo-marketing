import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Mail, KeyRound } from 'lucide-react'

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
          <div className="flex flex-col items-center mb-7">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <LogIn className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Inter, sans-serif', textTransform: 'none' }}>
              Prijavite se
            </h2>
            <p className="text-sm text-slate-500 mt-1">Upravljajte marketingom uz pomoć AI-ja</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            </div>
            <div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm text-slate-900 transition-all placeholder-slate-400"
                  placeholder="Lozinka"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-2"
            >
              {loading ? 'Prijava...' : 'Prijavi se'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {'Nemate račun? '}
            <Link to="/register" className="text-sky-600 hover:text-sky-700 font-medium hover:underline">
              Registrirajte se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
