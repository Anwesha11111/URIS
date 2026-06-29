'use strict';

/**
 * backfill-alumni-intern-records.js
 *
 * Creates Intern records for the 4 imported alumni who were
 * imported without one. Required before InternshipArchive stubs
 * can be created via finishInternship.
 *
 * READ-SAFE: only creates records, never deletes or updates.
 * Idempotent: skips users who already have an Intern record.
 *
 * Usage:
 *   node scripts/backfill-alumni-intern-records.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALUMNI_EMAILS = [
  'subhashisdash-eios@epochs-stemonef.org',
  'tarkeshwar.sharma@steami.network',
  'pc.ep.pg@gmail.com',
  'shruti.eios.alpha.evt.sil@gmail.com',
];

async function main() {
  console.log('\nBackfilling Intern records for alumni...\n');

  let created = 0;
  let skipped = 0;

  for (const email of ALUMNI_EMAILS) {
    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, email: true, status: true, role: true },
    });

    if (!user) {
      console.log(`  NOT FOUND  ${email}`);
      continue;
    }

    const existing = await prisma.intern.findUnique({ where: { userId: user.id } });
    if (existing) {
      console.log(`  SKIP       ${email} — intern record already exists (${existing.id})`);
      skipped++;
      continue;
    }

    const intern = await prisma.intern.create({
      data:   { userId: user.id },
      select: { id: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId:   null,
        action:   'BACKFILL_INTERN_RECORD',
        entity:   'INTERN',
        entityId: intern.id,
        metadata: { email, reason: 'Phase 5A post-import alumni backfill' },
      },
    });

    console.log(`  CREATED    ${email} → internId=${intern.id}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}\n`);
}

main()
  .catch(err => { console.error('Backfill failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
