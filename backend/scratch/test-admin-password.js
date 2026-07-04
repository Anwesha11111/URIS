const { login } = require('../src/services/auth.service');
const { changePassword } = require('../src/services/password.service');
const prisma = require('../src/utils/prisma');

async function testAdmin() {
  const email = 'official@stemonef.org';
  const currentPassword = 'Stemonef@2026!';
  const newPassword = 'Stemonef@2027!';
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log('Admin not found'); return; }

    const res1 = await login({ email, password: currentPassword, ip: '127.0.0.1' });
    console.log('[PASS] Login with current password');

    await changePassword(user.id, { currentPassword, newPassword });
    console.log('[PASS] Changed password');

    const res2 = await login({ email, password: newPassword, ip: '127.0.0.1' });
    console.log('[PASS] Login with new password');

    await changePassword(user.id, { currentPassword: newPassword, newPassword: currentPassword });
    console.log('[PASS] Reset password back');

  } catch (err) {
    console.log('[FAIL] ' + err.message);
  }
}

testAdmin().finally(() => prisma.$disconnect());
