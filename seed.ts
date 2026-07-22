import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('AdminPassword123!', 10);
  const userPass = await bcrypt.hash('UserPassword123!', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@example.com', password_hash: adminPass, role: 'ADMIN' }
  });

  await prisma.user.upsert({
    where: { username: 'demo_user' },
    update: {},
    create: { username: 'demo_user', email: 'demo@example.com', password_hash: userPass, role: 'USER' }
  });

  await prisma.premiumPlan.createMany({
    data: [
      { name: 'Premium 1 Bulan', description: 'Akses penuh selama 30 hari', duration_days: 30, price: 100000, is_active: true },
      { name: 'Premium 3 Bulan', description: 'Akses penuh selama 90 hari', duration_days: 90, price: 250000, is_active: true },
      { name: 'Premium 1 Tahun', description: 'Akses penuh selama 365 hari', duration_days: 365, price: 100000, is_active: true }, // Sesuai request
    ],
    skipDuplicates: true
  });

  console.log('Seed data berhasil dibuat.');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());