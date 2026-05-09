/**
 * seed-alerts.js — creates one alert per intern per type (no duplicates).
 * Intern-facing alerts use "you/your". Admin-facing use the intern's name.
 * Run: node scripts/seed-alerts.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('\n🔔 Seeding alerts...\n');

  const interns = await prisma.intern.findMany({
    include: {
      user:  { select: { name: true, email: true } },
      tasks: true,
    },
  });

  if (!interns.length) {
    console.log('No interns found. Run the main seed first.');
    return;
  }

  let created = 0;

  for (const intern of interns) {
    const name = intern.user?.name || intern.user?.email?.split('@')[0] || 'Intern';
    const activeTasks = intern.tasks.filter(t => t.status === 'active');
    const hasAvailability = await prisma.availabilitySlot.findFirst({ where: { internId: intern.id } });

    // ── Intern-facing: availability reminder (only if no availability submitted and no existing alert) ──
    if (!hasAvailability) {
      const existingReminder = await prisma.alert.findFirst({
        where: { internId: intern.id, type: 'availability_reminder', resolved: false },
      });
      if (!existingReminder) {
        await prisma.alert.create({
          data: {
            internId: intern.id,
            type:     'availability_reminder',
            severity: 'warning',
            message:  `${name} has not submitted availability for this week. Tasks cannot be assigned until availability is confirmed.`,
          },
        });
        created++;
      }
    }

    // ── Intern-facing: task assigned (one per active task, max 1) ──
    if (activeTasks.length > 0) {
      const task = activeTasks[0];
      await prisma.alert.create({
        data: {
          internId: intern.id,
          taskId:   task.id,
          type:     'task_assigned',
          severity: 'warning',
          message:  `You have been assigned: "${task.title}". Update your progress regularly.`,
        },
      });
      created++;
    }

    // ── Admin-facing: overload (only if 2+ active tasks) ──
    if (activeTasks.length >= 2) {
      await prisma.alert.create({
        data: {
          internId: intern.id,
          type:     'overload',
          severity: 'critical',
          message:  `${name} has ${activeTasks.length} active tasks. Consider deferring new assignments.`,
        },
      });
      created++;
    }

    console.log(`✓ ${name}`);
  }

  console.log(`\n✅ Created ${created} alerts.\n`);
}

run()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
