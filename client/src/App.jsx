import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'

function Guard({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/" replace />
  return children
}

function Home() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'pimpinan' ? '/pimpinan' : '/teknisi'} replace />
}

function Sementara({ judul }) {
  const { user, logout } = useAuth()
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-bold text-telkom">{judul}</h1>
      <p>Halo, {user.nama} ({user.role})</p>
      <button onClick={logout} className="rounded-lg bg-slate-700 px-3 py-1">Keluar</button>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pimpinan" element={<Guard role="pimpinan"><Sementara judul="Dashboard Pimpinan" /></Guard>} />
      <Route path="/teknisi" element={<Guard role="teknisi"><Sementara judul="Tugas Teknisi" /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}