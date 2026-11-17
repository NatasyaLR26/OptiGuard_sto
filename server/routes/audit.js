import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase.js';
import { authRequired, roleOnly } from '../middleware/auth.js';
import { kalkulasiGrading } from '../services/grading.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

router.post('/', authRequired, roleOnly('teknisi'), upload.single('foto'), async (req, res) => {
  const b = req.body || {};
  const tiket_id = Number(b.tiket_id);
  const odp_id = Number(b.odp_id);
  if (!Number.isInteger(tiket_id) || !Number.isInteger(odp_id))
    return res.status(400).json({ error: 'tiket_id dan odp_id wajib angka' });
  if (!req.file) return res.status(400).json({ error: 'Foto bukti wajib (format gambar, maks 5 MB)' });

  let status;
  try {
    status = kalkulasiGrading({
      tiang: Number(b.tiang), boks: Number(b.boks), kabel: Number(b.kabel), port: Number(b.port),
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const { data: tiket } = await supabase
    .from('tiket_patroli').select('*').eq('id', tiket_id).maybeSingle();
  if (!tiket || tiket.teknisi_id !== req.user.id)
    return res.status(403).json({ error: 'Tiket tidak ditemukan atau bukan milik kamu' });
  if (tiket.status_tiket === 'Selesai')
    return res.status(409).json({ error: 'Tiket sudah selesai' });

  const { data: odp } = await supabase.from('odp').select('id, area').eq('id', odp_id).maybeSingle();
  if (!odp || odp.area !== tiket.area_klaster)
    return res.status(400).json({ error: 'ODP bukan bagian dari area tiket ini' });

  // Upload foto ke Storage
  const ext = req.file.mimetype.split('/')[1] || 'jpg';
  const path = `tiket-${tiket_id}/odp-${odp_id}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from('evidence')
    .upload(path, req.file.buffer, { contentType: req.file.mimetype });
  if (up.error) return res.status(500).json({ error: 'Upload foto gagal: ' + up.error.message });
  const foto_url = supabase.storage.from('evidence').getPublicUrl(path).data.publicUrl;

  // Simpan audit + update odp + update tiket dalam satu transaksi
  const { error } = await supabase.rpc('submit_audit', {
    p_tiket_id: tiket_id, p_odp_id: odp_id,
    p_tiang: Number(b.tiang), p_boks: Number(b.boks),
    p_kabel: Number(b.kabel), p_port: Number(b.port),
    p_status: status, p_foto: foto_url,
  });
  if (error) {
    await supabase.storage.from('evidence').remove([path]);
    if (error.code === '23505')
      return res.status(409).json({ error: 'ODP ini sudah diaudit di tiket ini' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ status_akhir: status, foto_bukti: foto_url });
});

export default router;