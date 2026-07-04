'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

const EMAIL    = process.argv[2];
const TEST_PWD = process.argv[3] || 'Stemonef@2026!';

async function run() {
  if (!EMAIL) { console.error('Usage: node scripts/_check-user.js <email> [password]'); process.exit(1); }

  const user = await p.user.findUnique({
    where:  { email: EMAIL },
    select: { id: true, email: true, role: true, status: true, password: true,
              mustChangePassword: true, onboardingEmailStatus: true, credentialsGeneratedAt: true },
  });

  if (!user) { console.log(`NOT FOUND in DB: ${EMAIL}`); return; }

  console.log('  email:                 ', user.email);
  console.log('  role:                  ', user.role);
  console.log('  status:                ', user.status);
  console.log('  mustChangePassword:    ', user.mustChangePassword);
  console.log('  onboardingEmailStatus: ', user.onboardingEmailStatus);
  console.log('  credentialsGeneratedAt:', user.credentialsGeneratedAt);

  const match = await bcrypt.compare(TEST_PWD, user.password);
  console.log(`\n  Password "${TEST_PWD}" matches: ${match ? 'YES ✓' : 'NO ✗'}`);
  if (!match) console.log('  → Stored hash does not match this password. Use a different one or regenerate credentials.');
}

run().catch(console.error).finally(() => p.$disconnect());
