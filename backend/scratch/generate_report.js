const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

function isSafeToDeleteUser(user) {
  if (!user) return true;
  const email = (user.email || '').toLowerCase();
  const name = (user.name || '').toLowerCase();
  if (email.includes('test') || email.includes('example') || email.includes('duplicate') || email.endsWith('.local')) {
    return true;
  }
  if (name.includes('test') || name.includes('duplicate') || name.includes('e2e')) {
    return true;
  }
  // also check if email is just something obviously dummy, e.g. e2e_intern
  if (email.startsWith('e2e_')) {
    return true;
  }
  return false;
}

function isSafeToDeleteTeam(team) {
  const name = (team.name || '').toLowerCase();
  if (name.includes('test') || name.includes('dummy') || name.includes('temp') || name.includes('e2e')) {
    return true;
  }
  return false;
}

async function main() {
  const users = await prisma.user.findMany();
  const teams = await prisma.team.findMany();
  const userTeams = await prisma.userTeam.findMany({
    include: { user: true, team: true }
  });
  const interns = await prisma.intern.findMany({
    include: { user: true }
  });

  const report = [];
  report.push('# Database Analysis Report\n');

  report.push('## Users');
  const safeUsers = users.filter(u => isSafeToDeleteUser(u));
  const keepUsers = users.filter(u => !isSafeToDeleteUser(u));
  report.push(`**Total Users:** ${users.length}`);
  report.push(`- **Safe to delete:** ${safeUsers.length}`);
  report.push(`- **Must preserve:** ${keepUsers.length}\n`);

  report.push('### Safe to Delete Users');
  safeUsers.forEach(u => report.push(`- ${u.name} (${u.email}) [ID: ${u.id}]`));
  report.push('\n### Must Preserve Users');
  keepUsers.forEach(u => report.push(`- ${u.name} (${u.email}) [ID: ${u.id}]`));

  report.push('\n## Teams');
  const safeTeams = teams.filter(t => isSafeToDeleteTeam(t));
  const keepTeams = teams.filter(t => !isSafeToDeleteTeam(t));
  report.push(`**Total Teams:** ${teams.length}`);
  report.push(`- **Safe to delete:** ${safeTeams.length}`);
  report.push(`- **Must preserve:** ${keepTeams.length}\n`);

  report.push('### Safe to Delete Teams');
  safeTeams.forEach(t => report.push(`- ${t.name} [ID: ${t.id}]`));
  report.push('\n### Must Preserve Teams');
  keepTeams.forEach(t => report.push(`- ${t.name} [ID: ${t.id}]`));

  report.push('\n## UserTeam Records');
  const safeUT = userTeams.filter(ut => isSafeToDeleteUser(ut.user) || isSafeToDeleteTeam(ut.team));
  const keepUT = userTeams.filter(ut => !isSafeToDeleteUser(ut.user) && !isSafeToDeleteTeam(ut.team));
  report.push(`**Total UserTeam Records:** ${userTeams.length}`);
  report.push(`- **Safe to delete:** ${safeUT.length}`);
  report.push(`- **Must preserve:** ${keepUT.length}\n`);

  report.push('### Safe to Delete UserTeam Records');
  safeUT.forEach(ut => report.push(`- User: ${ut.user?.email || 'N/A'}, Team: ${ut.team?.name || 'N/A'}`));
  report.push('\n### Must Preserve UserTeam Records');
  keepUT.forEach(ut => report.push(`- User: ${ut.user?.email || 'N/A'}, Team: ${ut.team?.name || 'N/A'}`));

  report.push('\n## Intern Records');
  const safeInterns = interns.filter(i => isSafeToDeleteUser(i.user));
  const keepInterns = interns.filter(i => !isSafeToDeleteUser(i.user));
  report.push(`**Total Intern Records:** ${interns.length}`);
  report.push(`- **Safe to delete:** ${safeInterns.length}`);
  report.push(`- **Must preserve:** ${keepInterns.length}\n`);

  report.push('### Safe to Delete Intern Records');
  safeInterns.forEach(i => report.push(`- Intern ID: ${i.id}, User: ${i.user?.email || 'ORPHANED'}`));
  report.push('\n### Must Preserve Intern Records');
  keepInterns.forEach(i => report.push(`- Intern ID: ${i.id}, User: ${i.user?.email || 'ORPHANED'}`));

  fs.writeFileSync(path.join(__dirname, 'report.md'), report.join('\n'));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
