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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #8ec5ed 0%, #a4d2f1 15%, #b5d9f4 30%, #c2e0f6 50%, #cde6f8 70%, #d4eafa 85%, #daedfb 100%)' }}
    >
      {/* Concentric arc circles — centered behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] pointer-events-none z-0">
        <div className="w-[900px] h-[900px] rounded-full border border-white/30" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[30%] pointer-events-none z-0">
        <div className="w-[700px] h-[700px] rounded-full border border-white/25" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[25%] pointer-events-none z-0">
        <div className="w-[500px] h-[500px] rounded-full border border-white/20" />
      </div>

      {/* Cloud layer — large, prominent, realistic shapes */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[1]">
        {/* Solid white base — bottom of screen */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white" />

        {/* Main cloud bank gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-white via-white/80 to-transparent" />

        {/* Large cloud puffs — overlapping for realistic effect */}
        <div className="absolute -bottom-16 left-[-8%] w-[500px] h-[220px] bg-white rounded-[50%]" style={{ filter: 'blur(1px)' }} />
        <div className="absolute -bottom-20 left-[10%] w-[450px] h-[200px] bg-white rounded-[50%]" style={{ filter: 'blur(2px)' }} />
        <div className="absolute -bottom-14 left-[30%] w-[400px] h-[190px] bg-white rounded-[50%]" style={{ filter: 'blur(1px)' }} />
        <div className="absolute -bottom-24 left-[45%] w-[480px] h-[210px] bg-white rounded-[50%]" style={{ filter: 'blur(2px)' }} />
        <div className="absolute -bottom-16 left-[65%] w-[420px] h-[200px] bg-white rounded-[50%]" style={{ filter: 'blur(1px)' }} />
        <div className="absolute -bottom-20 right-[-8%] w-[400px] h-[190px] bg-white rounded-[50%]" style={{ filter: 'blur(2px)' }} />

        {/* Upper wispy clouds — softer, more transparent */}
        <div className="absolute bottom-32 left-[2%] w-[320px] h-[100px] bg-white/70 rounded-[50%] blur-lg" />
        <div className="absolute bottom-40 left-[20%] w-[280px] h-[90px] bg-white/60 rounded-[50%] blur-xl" />
        <div className="absolute bottom-36 right-[5%] w-[350px] h-[110px] bg-white/65 rounded-[50%] blur-lg" />
        <div className="absolute bottom-44 right-[25%] w-[260px] h-[85px] bg-white/50 rounded-[50%] blur-xl" />
        <div className="absolute bottom-52 left-[40%] w-[200px] h-[70px] bg-white/40 rounded-[50%] blur-2xl" />
      </div>

      {/* Logo top-left */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5 z-20">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
          <span className="font-headline text-xs text-white font-bold">S1Z</span>
        </div>
        <span className="font-headline text-base tracking-wider text-slate-700 font-bold">ShiftOneZero</span>
      </div>

      {/* Card wrapper with gradient border */}
      <div className="w-full max-w-[420px] relative z-10">
        {/* Gradient border glow */}
        <div
          className="absolute -inset-[1px] rounded-[28px] opacity-60"
          style={{
            background: 'linear-gradient(135deg, rgba(168,145,235,0.4) 0%, rgba(180,200,255,0.3) 30%, rgba(255,255,255,0.1) 60%, rgba(200,180,255,0.3) 100%)',
          }}
        />
        {/* Outer glow */}
        <div
          className="absolute -inset-3 rounded-[32px] opacity-30 blur-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(168,145,235,0.3) 0%, rgba(140,180,255,0.2) 50%, rgba(200,160,255,0.3) 100%)',
          }}
        />

        {/* Card */}
        <div
          className="relative rounded-[26px] px-10 py-10"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
        >
          {/* Icon */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100/80 flex items-center justify-center mb-5 shadow-sm">
              <LogIn className="w-5 h-5 text-slate-500" />
            </div>
            <h2
              className="text-[22px] font-semibold text-slate-800 tracking-[-0.01em]"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'none' as const }}
            >
              Prijavite se
            </h2>
            <p className="text-[13px] text-slate-400 mt-1.5 text-center leading-relaxed max-w-[280px]">
              Upravljajte marketingom uz pomoć AI-ja
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50/80 border border-red-200/60 rounded-xl text-sm text-red-600 font-medium backdrop-blur-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-slate-800 transition-all placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300"
                style={{
                  background: 'rgba(241,245,249,0.7)',
                  border: '1px solid rgba(226,232,240,0.6)',
                }}
                placeholder="E-mail adresa"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-slate-800 transition-all placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300"
                style={{
                  background: 'rgba(241,245,249,0.7)',
                  border: '1px solid rgba(226,232,240,0.6)',
                }}
                placeholder="Lozinka"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-1"
              style={{
                background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {loading ? 'Prijava...' : 'Prijavi se'}
            </button>
          </form>

          <p className="text-center text-[13px] text-slate-400 mt-6">
            {'Nemate račun? '}
            <Link to="/register" className="text-sky-500 hover:text-sky-600 font-medium hover:underline">
              Registrirajte se
            </Link>
          </p>
        </div>
      </div>

      {/* Footer brand */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
        <span className="text-[12px] text-slate-400/70 font-medium tracking-wide">ShiftOneZero</span>
      </div>
    </div>
  )
}
