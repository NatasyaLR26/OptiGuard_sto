import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { authRequired, roleOnly } from '../middleware/auth.js';
import { kirimTelegram, pesanTiketBaru } from '../services/telegram.js';

const router = Router();

// Daftar area untuk dropdown
router.get('/area', authRequired, roleOnly('pimpinan'), async (_req, res) => {
  const { data, error } = await supabase.from('odp').select('area').not('area', 'is', null);
  if (error) return res.status(500).json({ error: error.message });
  res.json([...new Set(data.map((o) => o.area))].sort());
});

// Daftar teknisi untuk dropdown (akun pool id 99 dikecualikan)
router.get('/teknisi', authRequired, roleOnly('pimpinan'), async (_req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, nama_lengkap')
    .eq('role', 'teknisi')
    .neq('id', 99);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Buat tiket (pimpinan)
router.post('/', authRequired, roleOnly('pimpinan'), async (req, res) => {
  const { area_klaster, teknisi_id, tanggal_tugas } = req.body || {};
  if (!area_klaster || !teknisi_id)
    return res.status(400).json({ error: 'area_klaster dan teknisi_id wajib diisi' });

  const { count } = await supabase
    .from('odp').select('*', { count: 'exact', head: true }).eq('area', area_klaster);
  if (!count) return res.status(400).json({ error: 'Tidak ada ODP di area ini' });

  const { data: teknisi } = await supabase
    .from('users')
    .select('id, role, nama_lengkap, telegram_chat_id')
    .eq('id', teknisi_id)
    .maybeSingle();
  if (!teknisi || teknisi.role !== 'teknisi')
    return res.status(400).json({ error: 'Teknisi tidak valid' });

  const { data, error } = await supabase
    .from('tiket_patroli')
    .insert({
      pimpinan_id: req.user.id,
      teknisi_id,
      area_klaster,
      ...(tanggal_tugas && { tanggal_tugas }),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const teks = pesanTiketBaru({
    tiket: data, teknisi: teknisi.nama_lengkap, jumlahOdp: count, pimpinan: req.user.nama,
  });
  const terkirim = await kirimTelegram(teknisi.telegram_chat_id, teks);
  if (process.env.TELEGRAM_GROUP_ID) await kirimTelegram(process.env.TELEGRAM_GROUP_ID, teks);

  res.status(201).json({ tiket: data, jumlah_odp: count, telegram_terkirim: terkirim });
});

// Daftar tiket (pimpinan: semua, teknisi: milik sendiri)
router.get('/', authRequired, async (req, res) => {
  let q = supabase.from('tiket_patroli').select('*').order('id', { ascending: false });
  if (req.user.role === 'teknisi') q = q.eq('teknisi_id', req.user.id);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Antrean ODP dalam satu tiket
router.get('/:id/odp', authRequired, async (req, res) => {
  const { data: tiket } = await supabase
    .from('tiket_patroli').select('*').eq('id', req.params.id).maybeSingle();
  if (!tiket) return res.status(404).json({ error: 'Tiket tidak ditemukan' });
  if (req.user.role === 'teknisi' && tiket.teknisi_id !== req.user.id)
    return res.status(403).json({ error: 'Bukan tiket kamu' });

  const { data: odp, error } = await supabase
    .from('odp')
    .select('id, kode_odp, alamat, latitude, longitude, kapasitas_port, status_fisik')
    .eq('area', tiket.area_klaster)
    .order('id');
  if (error) return res.status(500).json({ error: error.message });

  const { data: audit } = await supabase
    .from('audit_valins').select('odp_id, status_akhir, foto_bukti').eq('tiket_id', tiket.id);
  const byOdp = new Map((audit || []).map((a) => [a.odp_id, a]));

  res.json({ tiket, odp: odp.map((o) => ({ ...o, audit: byOdp.get(o.id) || null })) });
});

// Teknisi mulai mengerjakan tiket (Pending -> In Progress)
router.post('/:id/mulai', authRequired, roleOnly('teknisi'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id tidak valid' });

  const { data: tiket } = await supabase
    .from('tiket_patroli').select('*').eq('id', id).maybeSingle();
  if (!tiket || tiket.teknisi_id !== req.user.id)
    return res.status(403).json({ error: 'Tiket tidak ditemukan atau bukan milik kamu' });
  if (tiket.status_tiket !== 'Pending')
    return res.status(409).json({ error: `Tiket sudah berstatus ${tiket.status_tiket}` });

  const { data, error } = await supabase
    .from('tiket_patroli')
    .update({ status_tiket: 'In Progress' })
    .eq('id', id)
    .eq('status_tiket', 'Pending')
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tiket: data });
});

export default router;