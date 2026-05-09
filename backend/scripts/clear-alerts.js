const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Delete all unresolved alerts so stale messages are cleared
  const result = await prisma.alert.deleteMany({ where: { resolved: false } });
  console.log(`Deleted ${result.count} unresolved alerts.`);

  // Also mark all resolved alerts as deleted for a clean slate
  const resolved = await prisma.alert.deleteMany({ where: { resolved: true } });
  console.log(`Deleted ${resolved.count} resolved alerts.`);
}

run()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
