'use strict';

/**
 * backfill-intern-records.js
 *
 * One-time script: creates an Intern record for every INTERN-role User
 * that doesn't already have one.
 *
 * Run: node backend/scripts/backfill-intern-records.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all INTERN users
  const internUsers = await prisma.user.findMany({
    where: { role: 'INTERN' },
    select: { id: true, email: true },
  });

  console.log(`Found ${internUsers.length} INTERN user(s).`);

  let created = 0;
  let skipped = 0;

  for (const user of internUsers) {
    const existing = await prisma.intern.findUnique({ where: { userId: user.id } });
    if (existing) {
      console.log(`  SKIP  ${user.email} — Intern record already exists (${existing.id})`);
      skipped++;
    } else {
      const intern = await prisma.intern.create({ data: { userId: user.id } });
      console.log(`  CREATE ${user.email} — Intern record created (${intern.id})`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch(err => { console.error('Backfill failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
