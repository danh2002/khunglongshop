const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
(async () => {
  const prisma = new PrismaClient();
  try {
    const o = await prisma.customer_order.findUnique({
      where: { id: 'c4eea80c-5bfb-4af7-8fef-0b111e20978f' },
      select: { id: true, status: true, paymentExpiresAt: true, paidAt: true, orderNumber: true },
    });
    console.log('ORDER:', JSON.stringify(o, null, 2));
    const s = fs.readFileSync('prisma/schema.prisma','utf8');
    const m = s.match(/enum OrderStatus \{[^}]+\}/s);
    console.log('ENUM:', m ? m[0] : 'NOT FOUND');
    const lines = fs.readFileSync('lib/paymentConfirmation.ts','utf8').split(/\r?\n/);
    lines.forEach((l,i)=>{
      if (l.includes('status') && (l.includes('if') || l.includes('!==') || l.includes('includes') || l.includes('PENDING') || l.includes('PROCESSING') || l.includes('PAYMENT_NOT_CONFIRMABLE') || l.includes('PAYMENT_CONFIRMATION_CONFLICT'))) {
        console.log((i+1)+': '+l);
      }
    });
  } catch (e) {
    console.error('ERROR:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
