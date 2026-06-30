const { login } = require('../src/services/auth.service');
const prisma = require('../src/utils/prisma');

async function testLogins() {
  const usersToTest = [
    { email: 'official@stemonef.org', type: 'Core Admin' },
    { email: 'harini.rv.opsl@stemonef.org', type: 'Operations Lead' },
    { email: 'anweshamohapatra11111@gmail.com', type: 'Technical Intern' },
    { email: 'tarkeshwar.sharma@steami.network', type: 'Alumni' }
  ];

  for (const u of usersToTest) {
    try {
      const res = await login({ email: u.email, password: 'Stemonef@2026!', ip: '127.0.0.1' });
      console.log(`[PASS] ${u.type} (${u.email}) logged in successfully.`);
    } catch (err) {
      console.log(`[FAIL] ${u.type} (${u.email}) login failed: ${err.message}`);
    }
  }

  // Check if temporary passwords are hashed
  const user = await prisma.user.findUnique({ where: { email: 'anweshamohapatra11111@gmail.com' } });
  if (user && user.password.startsWith('$2b$')) {
    console.log('[PASS] Temporary passwords are hashed properly.');
  } else {
    console.log('[FAIL] Temporary passwords are not hashed.');
  }
}

testLogins().finally(() => prisma.$disconnect());
