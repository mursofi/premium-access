import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin, AuthRequest } from './middleware/auth';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) return res.status(400).json({ error: 'Username atau email sudah digunakan.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { username, email, password_hash } });
    res.status(201).json({ message: 'Registrasi berhasil.' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });
    if (!user) return res.status(400).json({ error: 'Kredensial salah.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Kredensial salah.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// --- USER ROUTES ---
app.get('/api/user/profile', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json(user);
});

app.get('/api/plans', async (req, res) => {
  const plans = await prisma.premiumPlan.findMany({ where: { is_active: true } });
  res.json(plans);
});

app.post('/api/user/request-premium', authenticate, async (req: AuthRequest, res) => {
  try {
    const { plan_id } = req.body;
    const plan = await prisma.premiumPlan.findUnique({ where: { id: plan_id } });
    if (!plan) return res.status(404).json({ error: 'Paket tidak ditemukan.' });

    const request = await prisma.premiumRequest.create({
      data: {
        user_id: req.user!.id,
        plan_id,
        amount: plan.price,
        payment_method: 'bank_transfer',
        payment_status: 'PENDING',
      }
    });
    res.status(201).json({ message: 'Permintaan berhasil dibuat. Menunggu verifikasi Admin.', request });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Middleware untuk proteksi fitur Premium
export const requirePremium = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.premium_status) return res.status(403).json({ error: 'Akses ditolak. Akun tidak Premium.' });
  if (user.premium_expiry && new Date(user.premium_expiry) < new Date()) {
    await prisma.user.update({ where: { id: user.id }, data: { premium_status: false } });
    return res.status(403).json({ error: 'Masa Premium telah berakhir.' });
  }
  next();
};

app.get('/api/premium-content', authenticate, requirePremium, (req, res) => {
  res.json({ message: 'Ini adalah konten eksklusif Premium!' });
});

// --- ADMIN ROUTES ---
app.get('/api/admin/stats', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const totalUsers = await prisma.user.count();
  const activePremium = await prisma.user.count({ where: { premium_status: true } });
  const pendingRequests = await prisma.premiumRequest.count({ where: { payment_status: 'PENDING' } });
  const totalRevenue = await prisma.premiumRequest.aggregate({
    _sum: { amount: true },
    where: { payment_status: 'PAID' }
  });
  res.json({ totalUsers, activePremium, pendingRequests, totalRevenue: totalRevenue._sum.amount || 0 });
});

app.get('/api/admin/requests', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const requests = await prisma.premiumRequest.findMany({
    include: { user: { select: { username: true, email: true } }, plan: true, admin: { select: { username: true } } },
    orderBy: { requested_at: 'desc' }
  });
  res.json(requests);
});

app.post('/api/admin/requests/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;
    
    const request = await prisma.premiumRequest.findUnique({ where: { id }, include: { plan: true, user: true } });
    if (!request || request.payment_status !== 'PENDING') return res.status(400).json({ error: 'Permintaan tidak valid.' });

    const durationMs = request.plan.duration_days * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    // Hitung expiry: jika sudah premium, tambahkan dari expiry lama. Jika tidak, mulai dari sekarang.
    let newExpiry = now;
    if (request.user.premium_status && request.user.premium_expiry && new Date(request.user.premium_expiry) > now) {
      newExpiry = new Date(new Date(request.user.premium_expiry).getTime() + durationMs);
    } else {
      newExpiry = new Date(now.getTime() + durationMs);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.user_id },
        data: { premium_status: true, premium_start: now, premium_expiry: newExpiry }
      }),
      prisma.premiumRequest.update({
        where: { id },
        data: { payment_status: 'PAID', verified_by: adminId, verified_at: now }
      }),
      prisma.adminLog.create({
        data: {
          admin_id: adminId,
          action: 'ACTIVATE_PREMIUM',
          target_user_id: request.user_id,
          description: `Premium ${request.plan.name} diaktifkan setelah pembayaran diverifikasi manual.`
        }
      })
    ]);

    res.json({ message: 'Premium berhasil diaktifkan.' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.post('/api/admin/requests/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.premiumRequest.findUnique({ where: { id }, include: { user: true, plan: true } });
    
    await prisma.$transaction([
      prisma.premiumRequest.update({ where: { id }, data: { payment_status: 'REJECTED', verified_by: req.user!.id, verified_at: new Date() } }),
      prisma.adminLog.create({
        data: {
          admin_id: req.user!.id,
          action: 'REJECT_PREMIUM',
          target_user_id: request?.user_id,
          description: `Permintaan Premium ${request?.plan.name} ditolak.`
        }
      })
    ]);
    res.json({ message: 'Permintaan ditolak.' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.get('/api/admin/logs', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const logs = await prisma.adminLog.findMany({
    include: { admin: { select: { username: true } }, user: { select: { username: true } } }, // Note: relation name might need adjustment based on schema
    orderBy: { created_at: 'desc' },
    take: 50
  });
  res.json(logs);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));