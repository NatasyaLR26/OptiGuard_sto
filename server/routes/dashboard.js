import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { authRequired, roleOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, roleOnly('pimpinan'), async (_req, res) => {
  const { data, error } = await supabase.from('odp').select('status_fisik');
  if (error) return res.status(500).json({ error: error.message });
  const rekap = { Aman: 0, Warning: 0, Critical: 0 };
  data.forEach((o) => { rekap[o.status_fisik] = (rekap[o.status_fisik] || 0) + 1; });
  res.json(rekap);
});

export default router;