import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
const ROLE_OPTIGUARD = ['pimpinan', 'teknisi'];

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email dan password wajib diisi' });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, nama_lengkap, role, email, password')
    .eq('email', email)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  // Sistem Utama menyimpan teks biasa; hash bcrypt juga didukung kalau nanti diganti
  const cocok = user && (user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : user.password === password);
  if (!cocok) return res.status(401).json({ error: 'Email atau password salah' });

  if (!ROLE_OPTIGUARD.includes(user.role))
    return res.status(403).json({ error: 'Role ini tidak punya akses ke OptiGuard' });

  const token = jwt.sign(
    { id: user.id, role: user.role, nama: user.nama_lengkap },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, nama: user.nama_lengkap, role: user.role } });
});

router.get('/me', authRequired, (req, res) => res.json({ user: req.user }));

export default router;