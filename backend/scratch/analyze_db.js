const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true }
  });
  const teams = await prisma.team.findMany();
  const userTeams = await prisma.userTeam.findMany({
    include: { user: { select: { email: true } }, team: { select: { name: true } } }
  });
  const interns = await prisma.intern.findMany({
    include: { user: { select: { email: true, name: true } } }
  });

  console.log(JSON.stringify({
    users,
    teams,
    userTeams,
    interns
  }, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
