const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Seeding database...');

    // Create demo users
    const demoUsers = [
      {
        email: 'demo@uris.com',
        password: 'Demo123!',
        role: 'INTERN',
      },
      {
        email: 'admin@uris.com',
        password: 'Admin123!',
        role: 'ADMIN',
      },
      {
        email: 'intern1@uris.com',
        password: 'Intern123!',
        role: 'INTERN',
      },
    ];

    for (const user of demoUsers) {
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existing) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const created = await prisma.user.create({
          data: {
            email: user.email,
            password: hashedPassword,
            role: user.role,
          },
        });

        // Also create an Intern record if the user is an INTERN
        if (user.role === 'INTERN') {
          await prisma.intern.create({
            data: {
              userId: created.id,
            },
          });
        }

        console.log(`✓ Created user: ${user.email}`);
      } else {
        console.log(`✗ User already exists: ${user.email}`);
      }
    }

    console.log('✓ Seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
