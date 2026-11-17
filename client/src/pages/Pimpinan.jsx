import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'

const warnaStatus = {
  Aman: 'text-aman', Normal: 'text-aman', Warning: 'text-warn', Critical: 'text-telkom',
}
const warnaTiket = {
  Pending: 'bg-slate-600', 'In Progress': 'bg-warn text-slate-900', Selesai: 'bg-aman text-slate-900',
}

export default function Pimpinan() {
  const { user, logout } = useAuth()
  const [rekap, setRekap] = useState({ Aman: 0, Warning: 0, Critical: 0 })
  const [areas, setAreas] = useState([])
  const [teknisi, setTeknisi] = useState([])
  const [tiket, setTiket] = useState([])
  const [form, setForm] = useState({ area_klaster: '', teknisi_id: '', tanggal_tugas: '' })
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const muat = useCallback(async () => {
    const [r, a, t, tk] = await Promise.all([
      api('/dashboard'), api('/tiket/area'), api('/tiket/teknisi'), api('/tiket'),
    ])
    setRekap(r); setAreas(a); setTeknisi(t); setTiket(tk)
  }, [])

  useEffect(() => {
    muat().catch((e) => setMsg({ ok: false, teks: e.message }))
  }, [muat])

  const namaTeknisi = (id) => teknisi.find((t) => t.id === id)?.nama_lengkap || `#${id}`

  async function buat(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const body = { area_klaster: form.area_klaster, teknisi_id: Number(form.teknisi_id) }
      if (form.tanggal_tugas) body.tanggal_tugas = form.tanggal_tugas
      const r = await api('/tiket', { method: 'POST', body })
      setMsg({
        ok: true,
        teks: `Tiket #${r.tiket.id} dibuat (${r.jumlah_odp} ODP). Telegram: ${
          r.telegram_terkirim ? 'terkirim' : 'tidak terkirim (teknisi belum punya chat id atau bot gagal)'
        }`,
      })
      setForm({ area_klaster: '', teknisi_id: '', tanggal_tugas: '' })
      await muat()
    } catch (err) {
      setMsg({ ok: false, teks: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function buka(id) {
    try {
      setDetail(await api(`/tiket/${id}/odp`))
    } catch (err) {
      setMsg({ ok: false, teks: err.message })
    }
  }

  const input = 'w-full rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-telkom'

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-telkom">OPTIGUARD · Pimpinan</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">{user.nama}</span>
          <button onClick={logout} className="rounded-lg bg-slate-700 px-3 py-1">Keluar</button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        {['Aman', 'Warning', 'Critical'].map((k) => (
          <div key={k} className="rounded-xl bg-slate-800 p-4 text-center">
            <div className={`text-3xl font-bold ${warnaStatus[k]}`}>{rekap[k] ?? 0}</div>
            <div className="text-xs text-slate-400">ODP {k.toUpperCase()}</div>
          </div>
        ))}
      </section>

      <form onSubmit={buat} className="rounded-xl bg-slate-800 p-4 space-y-3">
        <h2 className="font-semibold text-slate-300">Dispatching Tiket Patroli</h2>
        <select required className={input} value={form.area_klaster}
          onChange={(e) => setForm({ ...form, area_klaster: e.target.value })}>
          <option value="">Pilih area klaster</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select required className={input} value={form.teknisi_id}
          onChange={(e) => setForm({ ...form, teknisi_id: e.target.value })}>
          <option value="">Pilih teknisi</option>
          {teknisi.map((t) => <option key={t.id} value={t.id}>{t.nama_lengkap}</option>)}
        </select>
        <input type="date" className={input} value={form.tanggal_tugas}
          onChange={(e) => setForm({ ...form, tanggal_tugas: e.target.value })} />
        <button disabled={loading}
          className="w-full rounded-lg bg-telkom py-2 font-semibold disabled:opacity-60">
          {loading ? 'Memproses...' : 'Buat Tugas & Broadcast Telegram'}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-aman' : 'text-red-400'}`}>{msg.teks}</p>}
      </form>

      <section className="rounded-xl bg-slate-800 p-4 space-y-2">
        <h2 className="font-semibold text-slate-300">Daftar Tiket</h2>
        {tiket.length === 0 && <p className="text-sm text-slate-400">Belum ada tiket.</p>}
        {tiket.map((t) => (
          <button key={t.id} onClick={() => buka(t.id)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-700 px-3 py-2 text-left">
            <div>
              <div className="font-medium">#{t.id} · {t.area_klaster}</div>
              <div className="text-xs text-slate-400">
                {namaTeknisi(t.teknisi_id)} · {t.tanggal_tugas}
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${warnaTiket[t.status_tiket]}`}>
              {t.status_tiket}
            </span>
          </button>
        ))}
      </section>

      {detail && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-slate-800 p-4 space-y-3 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tiket #{detail.tiket.id} · {detail.tiket.area_klaster}</h3>
              <button onClick={() => setDetail(null)} className="text-slate-400">Tutup</button>
            </div>
            {detail.odp.map((o) => (
              <div key={o.id} className="rounded-lg bg-slate-700 p-3 text-sm space-y-1">
                <div className="font-medium">{o.kode_odp}</div>
                <div className="text-xs text-slate-400">{o.alamat}</div>
                <div>
                  Status fisik: <span className={warnaStatus[o.status_fisik]}>{o.status_fisik}</span>
                </div>
                {o.audit ? (
                  <div className="flex items-center gap-3">
                    <span>Hasil audit: <b className={warnaStatus[o.audit.status_akhir]}>{o.audit.status_akhir}</b></span>
                    {o.audit.foto_bukti && (
                      <a href={o.audit.foto_bukti} target="_blank" rel="noreferrer">
                        <img src={o.audit.foto_bukti} alt="Eviden" className="h-14 w-14 rounded object-cover" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400">Belum diaudit</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}