const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envFile = path.join(process.cwd(), '.env.local');
const env = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile, 'utf8')) : null;
if (!env || !env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}
process.env.DATABASE_URL = env.DATABASE_URL.replace(/^"|"$/g, '');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const o = await prisma.customer_order.findUnique({
      where: { id: 'c4eea80c-5bfb-4af7-8fef-0b111e20978f' },
      select: { id: true, status: true, paymentExpiresAt: true, paidAt: true, orderNumber: true, paymentRef: true },
    });
    console.log('ORDER:', JSON.stringify(o, null, 2));
  } catch (e) {
    console.error('ERROR:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
