import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const u = await login(email, password)
      nav(u.role === 'pimpinan' ? '/pimpinan' : '/teknisi', { replace: true })
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold text-telkom">OPTIGUARD</h1>
        <p className="text-sm text-slate-400">Validasi Instalasi & Preventive Maintenance ODP</p>
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-telkom"
        />
        <input
          type="password" required placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-telkom"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-telkom py-2 font-semibold disabled:opacity-60"
        >
          {loading ? 'Masuk...' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}