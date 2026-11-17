import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'
import Pimpinan from './pages/Pimpinan.jsx'
import Teknisi from './pages/Teknisi.jsx'

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
      <h1 className="text-xl font-bold text-[#ED1C24]">{judul}</h1>
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
      <Route path="/pimpinan" element={<Guard role="pimpinan"><Pimpinan /></Guard>} />
      <Route path="/teknisi" element={<Guard role="teknisi"><Teknisi /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}