import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock } from 'lucide-react'

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
    <div className="min-h-screen bg-dinamo-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-dinamo-accent mx-auto flex items-center justify-center mb-4">
            <span className="font-headline text-3xl text-gray-900 font-bold">D</span>
          </div>
          <h1 className="font-headline text-3xl tracking-wider text-white font-bold">DINAMO</h1>
          <p className="text-sm uppercase tracking-[0.2em] text-dinamo-accent mt-1">Marketing Platforma</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-dinamo-muted" />
            <h2 className="font-headline text-lg text-gray-900">Prijava</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail adresa</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-dinamo-accent/50 text-sm"
                placeholder="admin@dinamo.hr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lozinka</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-dinamo-accent/50 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-dinamo-accent hover:bg-dinamo-accent-hover text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Prijava...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
