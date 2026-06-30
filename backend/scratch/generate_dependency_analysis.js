const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const TARGET_EMAILS = [
  'e2e_intern_1781163422963@test.com',
  'e2e_intern_1780319805059@test.com',
  'e2e_intern_1781159403438@test.com',
  'assign-intern-12345@test.local',
  'e2e_intern_1781166062217@test.com',
  'e2e_intern_1780318887958@test.com',
  'e2e_intern_1780319813903@test.com',
  'e2e_intern_1781159421392@test.com',
  'e2e_intern_1781165744033@test.com',
  'e2e_intern_1781165751800@test.com',
  'e2e_intern_1781165626126@test.com',
  'e2e_intern_1781165615011@test.com',
  'e2e_intern_1781165829340@test.com'
];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    include: {
      intern: {
        include: {
          tasks: true,
          reviews: true,
          internshipArchive: true
        }
      },
      teams: true,
      chats: true,
    }
  });

  const orphanedInterns = await prisma.intern.findMany({
    where: { userId: null },
    include: {
      tasks: true,
      reviews: true,
      internshipArchive: true
    }
  });

  let taskCount = 0;
  let reviewCount = 0;
  let userTeamCount = 0;
  let chatMembershipCount = 0;
  let archiveCount = 0;

  for (const u of users) {
    if (u.intern) {
      taskCount += u.intern.tasks.length;
      reviewCount += u.intern.reviews.length;
      if (u.intern.internshipArchive) archiveCount++;
    }
    userTeamCount += u.teams.length;
    chatMembershipCount += u.chats.length;
  }

  for (const oi of orphanedInterns) {
    taskCount += oi.tasks.length;
    reviewCount += oi.reviews.length;
    if (oi.internshipArchive) archiveCount++;
  }

  const report = [
    '# Dependency Analysis Report',
    '',
    `**Users to delete:** ${users.length}`,
    `**Orphaned Interns to delete:** ${orphanedInterns.length}`,
    '',
    '## Dependencies found:',
    `- **Tasks linked to these interns:** ${taskCount}`,
    `- **Reviews linked to these interns:** ${reviewCount}`,
    `- **UserTeam records linked to these users:** ${userTeamCount}`,
    `- **Chat memberships linked to these users:** ${chatMembershipCount}`,
    `- **Archive records linked to these interns:** ${archiveCount}`,
    '',
    '## Target Details:',
    '### Users'
  ];

  for (const u of users) {
    report.push(`- ${u.email} (ID: ${u.id})`);
    if (u.intern) {
      report.push(`  - Intern ID: ${u.intern.id}`);
      report.push(`  - Tasks: ${u.intern.tasks.length}`);
      report.push(`  - Reviews: ${u.intern.reviews.length}`);
      report.push(`  - Archives: ${u.intern.internshipArchive ? 1 : 0}`);
    }
    report.push(`  - Teams: ${u.teams.length}`);
    report.push(`  - Chats: ${u.chats.length}`);
  }

  report.push('');
  report.push('### Orphaned Interns');
  for (const oi of orphanedInterns) {
    report.push(`- Intern ID: ${oi.id}`);
    report.push(`  - Tasks: ${oi.tasks.length}`);
    report.push(`  - Reviews: ${oi.reviews.length}`);
    report.push(`  - Archives: ${oi.internshipArchive ? 1 : 0}`);
  }

  fs.writeFileSync(path.join(__dirname, 'dependency_report.md'), report.join('\n'));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
