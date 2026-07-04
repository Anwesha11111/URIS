'use strict';
/**
 * reset-admin-password.js
 *
 * One-time script to reset official@stemonef.org password to DEFAULT_TEMP_PASSWORD.
 * Run against the production DB (same Neon instance as Render).
 *
 * Usage:
 *   node scripts/reset-admin-password.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function run() {
  const tempPwd = process.env.DEFAULT_TEMP_PASSWORD;
  if (!tempPwd) { console.error('DEFAULT_TEMP_PASSWORD not set in .env'); process.exit(1); }

  const emails = [
    'official@stemonef.org',
    'kajaljha@stemonef.org',
    'nksingh-fci-fo@stemonef.org',
  ];

  const hash = await bcrypt.hash(tempPwd, 10);

  for (const email of emails) {
    const user = await p.user.findUnique({ where: { email }, select: { id: true, status: true } });
    if (!user) { console.log(`NOT FOUND: ${email}`); continue; }

    await p.user.update({
      where: { id: user.id },
      data: {
        password:              hash,
        passwordChangedAt:     null,
        mustChangePassword:    true,
        onboardingEmailStatus: 'MANUAL',
        credentialsGeneratedAt: new Date(),
      },
    });
    console.log(`RESET: ${email} → ${tempPwd}`);
  }

  console.log('\nDone. Log in with the temporary password and change it immediately.');
}

run().catch(console.error).finally(() => p.$disconnect());
