'use strict';

/**
 * audit-post-import.js — Phase 5A post-import production audit
 *
 * READ-ONLY. Does not modify any data.
 *
 * Usage:
 *   node scripts/audit-post-import.js
 *
 * Checks:
 *  1.  Total users imported
 *  2.  Total interns created
 *  3.  Total alumni created
 *  4.  Total teams
 *  5.  Team memberships
 *  6.  Lead assignments
 *  7.  Duplicate emails
 *  8.  Orphan intern records (Intern with no linked User)
 *  9.  Orphan UserTeam records (UserTeam pointing to non-existent User or Team)
 *  10. Missing InternshipArchive records for alumni
 *
 * Capability checks (route/controller existence — no DB write):
 *  A. Core Admin can edit users        → PATCH /admin/interns/:id + /admin/users/:id
 *  B. Core Admin can move between teams → PATCH /admin/interns/:id/team
 *  C. Core Admin can change roles       → POST /admin/change-role
 *  D. Core Admin can finish internship  → POST /admin/finish-internship
 *
 * Exit code:
 *  0 — all checks passed
 *  1 — one or more checks failed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Expected import values (from import manifest) ─────────────────────────────
const EXPECTED = {
  staff:  8,   // Vikas, Kajal, Akshay, Shashi, Harini, Nithin, Gautam, Rakshna.R
  intern: 12,  // Vishmitha, Shriyanshu, ANWESHA, SEETA ANANYA, Ishaan, Sahil,
               // Vaibhav, Priyadarshini, Niharika, BOPPANA HARSHA, Lakshya,
               // + Rakshna.R (forced intern record)  → 11 INTERN roles + 1 forced = 12
  alumni: 4,   // Subhashis, Tarkeshwar, Purba, Shruthi

  // Canonical team names that must exist after import
  requiredTeams: [
    'Core Team',
    'Operations Team',
    'STEAMI',
    'Silvapure',
    "Founder's Office",
    'Lab INVOS',
    'HumanON',
    'Technical',
  ],

  // Lead assignments: { email, teamName }
  leads: [
    { email: 'akshay.ravi@stemonef.org',              team: 'Silvapure' },
    { email: 'shashikushwaha@stemonef.org',            team: 'STEAMI' },
    { email: 'harini.rv.opsl@stemonef.org',            team: 'Operations Team' },
    { email: 'gj-lead-p-gaia@epochs-stemonef.org',    team: 'Silvapure' },
  ],

  // All imported emails (Sheet1 only, Sheet2 excluded)
  importedEmails: [
    'official@stemonef.org',
    'kajaljha@stemonef.org',
    'akshay.ravi@stemonef.org',
    'shashikushwaha@stemonef.org',
    'harini.rv.opsl@stemonef.org',
    'vishmithaarupa@gmail.com',
    'nksingh-fci-fo@stemonef.org',
    'gj-lead-p-gaia@epochs-stemonef.org',
    'subhashisdash-eios@epochs-stemonef.org',
    'tarkeshwar.sharma@steami.network',
    'ssh.ep.pg@gmail.com',
    'programmanagerrak@gmail.com',
    'anweshamohapatra11111@gmail.com',
    'ananyaseeta.stemonef@gmail.com',
    'ishaansenres@gmail.com',
    'sahilraj172303@gmail.com',
    'programmanagervs@gmail.com',
    'ppr.ep.pg@gmail.com',
    'pc.ep.pg@gmail.com',
    'np.ep.pg@gmail.com',
    'harshavardhanstem1@gmail.com',
    'lakshyaluvmimani@proton.me',
    'shruti.eios.alpha.evt.sil@gmail.com',
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const LINE  = '─'.repeat(72);
const PASS  = '\x1b[32m  PASS\x1b[0m';
const FAIL  = '\x1b[31m  FAIL\x1b[0m';
const WARN  = '\x1b[33m  WARN\x1b[0m';
const INFO  = '      ';

let totalPass = 0;
let totalFail = 0;

function pass(label, detail = '') {
  console.log(`${PASS}  ${label}${detail ? `  — ${detail}` : ''}`);
  totalPass++;
}

function fail(label, detail = '') {
  console.log(`${FAIL}  ${label}${detail ? `  — ${detail}` : ''}`);
  totalFail++;
}

function warn(label, detail = '') {
  console.log(`${WARN}  ${label}${detail ? `  — ${detail}` : ''}`);
}

function info(detail) {
  console.log(`${INFO}${detail}`);
}

function section(title) {
  console.log(`\n${LINE}`);
  console.log(`  ${title}`);
  console.log(LINE);
}

// ── Main audit ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${LINE}`);
  console.log('  URIS Phase 5A — Post-Import Production Audit');
  console.log(`  Run: ${new Date().toISOString()}`);
  console.log(`${LINE}`);
  console.log('  Mode: READ-ONLY. No data will be modified.\n');

  // ── 1. Total users imported ────────────────────────────────────────────────
  section('CHECK 1 — Total Users Imported');

  const presentEmails = await prisma.user.findMany({
    where:  { email: { in: EXPECTED.importedEmails } },
    select: { email: true, role: true, status: true },
  });
  const presentSet = new Set(presentEmails.map(u => u.email));
  const missing    = EXPECTED.importedEmails.filter(e => !presentSet.has(e));

  if (missing.length === 0) {
    pass(`All ${EXPECTED.importedEmails.length} imported users present in database`);
  } else {
    fail(`${missing.length} expected user(s) not found`);
    missing.forEach(e => info(`missing: ${e}`));
  }

  // ── 2. Total interns created ───────────────────────────────────────────────
  section('CHECK 2 — Intern Records Created');

  // Get userIds for imported intern-role users + Rakshna.R (forced)
  const internRoleUsers = await prisma.user.findMany({
    where: {
      email: { in: EXPECTED.importedEmails },
      OR: [
        { role: { in: ['TECHNICAL_INTERN', 'RESEARCH_INTERN', 'OPERATIONS_INTERN'] } },
        { email: 'programmanagerrak@gmail.com' }, // forced intern record
      ],
    },
    select: { id: true, email: true, role: true },
  });

  const internRecords = await prisma.intern.findMany({
    where:  { userId: { in: internRoleUsers.map(u => u.id) } },
    select: { id: true, userId: true },
  });

  const internUserIds   = new Set(internRecords.map(i => i.userId));
  const missingInternRec = internRoleUsers.filter(u => !internUserIds.has(u.id));

  if (missingInternRec.length === 0) {
    pass(`Intern records exist for all ${internRoleUsers.length} intern-role users`);
  } else {
    fail(`${missingInternRec.length} intern-role user(s) have no Intern record`);
    missingInternRec.forEach(u => info(`missing intern record: ${u.email} (${u.role})`));
  }

  info(`total intern records for imported users: ${internRecords.length}`);

  // ── 3. Total alumni created ────────────────────────────────────────────────
  section('CHECK 3 — Alumni (Past Employee) Records');

  const alumniUsers = await prisma.user.findMany({
    where: {
      email:  { in: EXPECTED.importedEmails },
      role:   'PAST_EMPLOYEE',
      status: 'alumni',
    },
    select: { email: true, status: true, role: true },
  });

  if (alumniUsers.length === EXPECTED.alumni) {
    pass(`${alumniUsers.length} alumni records correct (expected ${EXPECTED.alumni})`);
  } else if (alumniUsers.length > 0) {
    fail(`Alumni count mismatch — found ${alumniUsers.length}, expected ${EXPECTED.alumni}`);
    alumniUsers.forEach(u => info(`alumni: ${u.email}`));
  } else {
    fail('No alumni records found');
  }

  // Check alumni have status='alumni' AND role=PAST_EMPLOYEE
  const badAlumni = await prisma.user.findMany({
    where: {
      email:  { in: EXPECTED.importedEmails },
      OR: [
        { status: 'alumni', role: { not: 'PAST_EMPLOYEE' } },
        { role: 'PAST_EMPLOYEE', status: { not: 'alumni' } },
      ],
    },
    select: { email: true, status: true, role: true },
  });

  if (badAlumni.length === 0) {
    pass('All alumni have consistent status=alumni + role=PAST_EMPLOYEE');
  } else {
    fail(`${badAlumni.length} alumni with mismatched status/role`);
    badAlumni.forEach(u => info(`mismatch: ${u.email}  status=${u.status}  role=${u.role}`));
  }

  // ── 4. Total teams ─────────────────────────────────────────────────────────
  section('CHECK 4 — Team Records');

  const allTeams = await prisma.team.findMany({
    select: { name: true, status: true },
  });
  const teamNameSet = new Set(allTeams.map(t => t.name));

  const missingTeams = EXPECTED.requiredTeams.filter(n => !teamNameSet.has(n));
  if (missingTeams.length === 0) {
    pass(`All ${EXPECTED.requiredTeams.length} required teams present`);
    EXPECTED.requiredTeams.forEach(n => info(`✓ ${n}`));
  } else {
    fail(`${missingTeams.length} required team(s) missing`);
    missingTeams.forEach(n => info(`missing team: "${n}"`));
    const presentTeams = EXPECTED.requiredTeams.filter(n => teamNameSet.has(n));
    presentTeams.forEach(n => info(`✓ present: "${n}"`));
  }

  // ── 5. Team memberships ────────────────────────────────────────────────────
  section('CHECK 5 — Team Memberships');

  // Every imported user (except alumni with null team) should have at least one
  // active UserTeam row. Alumni with null team in manifest are exempt.
  const alumniNullTeamEmails = [
    'subhashisdash-eios@epochs-stemonef.org',
    'tarkeshwar.sharma@steami.network',
    'shruti.eios.alpha.evt.sil@gmail.com',
  ];
  const teamRequiredEmails = EXPECTED.importedEmails.filter(
    e => !alumniNullTeamEmails.includes(e)
  );

  const usersWithTeams = await prisma.user.findMany({
    where: { email: { in: teamRequiredEmails } },
    select: {
      email: true,
      teams: { where: { leftAt: null }, select: { teamId: true, role: true } },
    },
  });

  const noTeamUsers = usersWithTeams.filter(u => u.teams.length === 0);
  if (noTeamUsers.length === 0) {
    pass(`All ${teamRequiredEmails.length} non-alumni users have at least one team`);
  } else {
    fail(`${noTeamUsers.length} user(s) have no active team assignment`);
    noTeamUsers.forEach(u => info(`no team: ${u.email}`));
  }

  const totalMemberships = await prisma.userTeam.count({
    where: { leftAt: null, user: { email: { in: EXPECTED.importedEmails } } },
  });
  info(`total active UserTeam rows for imported users: ${totalMemberships}`);

  // ── 6. Lead assignments ────────────────────────────────────────────────────
  section('CHECK 6 — Lead Assignments');

  for (const { email, team: teamName } of EXPECTED.leads) {
    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, teams: { where: { leftAt: null }, include: { team: true } } },
    });

    if (!user) {
      fail(`User not found: ${email}`);
      continue;
    }

    const leadMembership = user.teams.find(
      t => t.team.name === teamName && t.role.toUpperCase() === 'LEAD'
    );

    if (leadMembership) {
      pass(`${email} is LEAD in "${teamName}"`);
    } else {
      const anyMembership = user.teams.find(t => t.team.name === teamName);
      if (anyMembership) {
        fail(`${email} is in "${teamName}" but role=${anyMembership.role} (expected LEAD)`);
      } else {
        fail(`${email} has no membership in "${teamName}"`);
      }
    }
  }

  // ── 7. Duplicate emails ────────────────────────────────────────────────────
  section('CHECK 7 — Duplicate Emails');

  // Group by email, count occurrences > 1
  const allEmails = await prisma.user.findMany({
    select: { email: true },
  });

  const emailCount = {};
  for (const { email } of allEmails) {
    emailCount[email] = (emailCount[email] || 0) + 1;
  }
  const duplicates = Object.entries(emailCount).filter(([, count]) => count > 1);

  if (duplicates.length === 0) {
    pass(`No duplicate emails found across ${allEmails.length} total users`);
  } else {
    fail(`${duplicates.length} duplicate email(s) found`);
    duplicates.forEach(([email, count]) => info(`duplicate: ${email}  (${count} rows)`));
  }

  // ── 8. Orphan Intern records ───────────────────────────────────────────────
  section('CHECK 8 — Orphan Intern Records');

  // Intern rows where userId is null or points to a non-existent user
  const allInterns = await prisma.intern.findMany({
    select: { id: true, userId: true },
  });

  const nullUserInterns = allInterns.filter(i => !i.userId);
  const nonNullInterns  = allInterns.filter(i => i.userId);

  const linkedUserIds = new Set(
    (await prisma.user.findMany({
      where:  { id: { in: nonNullInterns.map(i => i.userId) } },
      select: { id: true },
    })).map(u => u.id)
  );

  const danglingInterns = nonNullInterns.filter(i => !linkedUserIds.has(i.userId));

  if (nullUserInterns.length === 0 && danglingInterns.length === 0) {
    pass(`No orphan Intern records — all ${allInterns.length} interns have valid userId`);
  } else {
    if (nullUserInterns.length > 0) {
      fail(`${nullUserInterns.length} Intern record(s) with null userId`);
      nullUserInterns.forEach(i => info(`orphan intern: id=${i.id}`));
    }
    if (danglingInterns.length > 0) {
      fail(`${danglingInterns.length} Intern record(s) pointing to non-existent userId`);
      danglingInterns.forEach(i => info(`dangling: internId=${i.id}  userId=${i.userId}`));
    }
  }

  // ── 9. Orphan UserTeam records ─────────────────────────────────────────────
  section('CHECK 9 — Orphan UserTeam Records');

  const allUserTeams = await prisma.userTeam.findMany({
    select: { id: true, userId: true, teamId: true },
  });

  const allUserIdSet = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
  );
  const allTeamIdSet = new Set(
    (await prisma.team.findMany({ select: { id: true } })).map(t => t.id)
  );

  const orphanUserTeams = allUserTeams.filter(
    ut => !allUserIdSet.has(ut.userId) || !allTeamIdSet.has(ut.teamId)
  );

  if (orphanUserTeams.length === 0) {
    pass(`No orphan UserTeam records — all ${allUserTeams.length} memberships are valid`);
  } else {
    fail(`${orphanUserTeams.length} orphan UserTeam record(s)`);
    orphanUserTeams.forEach(ut => {
      const badUser = !allUserIdSet.has(ut.userId) ? ' [userId missing]' : '';
      const badTeam = !allTeamIdSet.has(ut.teamId) ? ' [teamId missing]' : '';
      info(`orphan: id=${ut.id}${badUser}${badTeam}`);
    });
  }

  // ── 10. Missing InternshipArchive for alumni ───────────────────────────────
  section('CHECK 10 — InternshipArchive Records for Alumni');

  const alumniRecords = await prisma.user.findMany({
    where: {
      email:  { in: EXPECTED.importedEmails },
      status: 'alumni',
    },
    select: {
      email:  true,
      intern: { select: { id: true, internshipArchive: { select: { id: true } } } },
    },
  });

  const noArchive = alumniRecords.filter(u => !u.intern?.internshipArchive);
  const hasArchive = alumniRecords.filter(u =>  u.intern?.internshipArchive);

  if (noArchive.length === 0) {
    pass(`All ${alumniRecords.length} alumni have InternshipArchive records`);
  } else {
    // This is expected immediately post-import — archives are stubs to be filled
    warn(`${noArchive.length} alumni missing InternshipArchive (expected — stubs needed)`);
    noArchive.forEach(u => info(`no archive: ${u.email}`));
    if (hasArchive.length > 0) {
      hasArchive.forEach(u => info(`has archive: ${u.email}`));
    }
  }

  // No intern record at all for an alumni is a harder failure
  const alumniNoIntern = alumniRecords.filter(u => !u.intern);
  if (alumniNoIntern.length > 0) {
    fail(`${alumniNoIntern.length} alumni have no Intern record (cannot create InternshipArchive)`);
    alumniNoIntern.forEach(u => info(`no intern record: ${u.email}`));
    info('FIX: run backfill — prisma.intern.create({ data: { userId } }) for each missing alumni');
  } else {
    pass(`All alumni have an Intern record (archive can be created)`);
  }

  // ── Capability checks ──────────────────────────────────────────────────────
  section('CAPABILITY CHECK A — Core Admin can edit users');

  try {
    const adminRouter = require('../src/routes/admin.routes.js');
    const stack = adminRouter.stack || [];

    // PATCH /admin/interns/:internId
    const patchIntern = stack.some(
      l => l.route?.path === '/interns/:internId' &&
           l.route.methods?.patch
    );
    // PATCH /admin/users/:userId
    const patchUser = stack.some(
      l => l.route?.path === '/users/:userId' &&
           l.route.methods?.patch
    );
    // PATCH /admin/interns/:internId/team (new)
    const patchTeam = stack.some(
      l => l.route?.path === '/interns/:internId/team' &&
           l.route.methods?.patch
    );

    patchIntern ? pass('PATCH /admin/interns/:internId registered') : fail('PATCH /admin/interns/:internId missing');
    patchUser   ? pass('PATCH /admin/users/:userId registered')     : fail('PATCH /admin/users/:userId missing');
    patchTeam   ? pass('PATCH /admin/interns/:internId/team registered') : fail('PATCH /admin/interns/:internId/team missing');
  } catch (err) {
    fail(`Could not load admin.routes.js: ${err.message}`);
  }

  section('CAPABILITY CHECK B — Core Admin can move users between teams');

  try {
    const adminRouter = require('../src/routes/admin.routes.js');
    const stack = adminRouter.stack || [];

    const assignTeam = stack.some(
      l => l.route?.path === '/interns/:internId/team' &&
           l.route.methods?.patch
    );
    const adminJoin = require('../src/routes/team.routes.js').stack?.some(
      l => l.route?.path === '/:teamId/members' &&
           l.route.methods?.post
    );
    const adminLeave = require('../src/routes/team.routes.js').stack?.some(
      l => l.route?.path === '/:teamId/members/:userId' &&
           l.route.methods?.delete
    );

    assignTeam  ? pass('PATCH /admin/interns/:internId/team (create-or-assign)') : fail('assign team route missing');
    adminJoin   ? pass('POST  /teams/:teamId/members (admin add member)')          : fail('admin add member route missing');
    adminLeave  ? pass('DELETE /teams/:teamId/members/:userId (admin remove)')     : fail('admin remove member route missing');
  } catch (err) {
    fail(`Route check failed: ${err.message}`);
  }

  section('CAPABILITY CHECK C — Core Admin can change roles');

  try {
    const adminRouter = require('../src/routes/admin.routes.js');
    const stack = adminRouter.stack || [];

    const changeRole = stack.some(
      l => l.route?.path === '/change-role' &&
           l.route.methods?.post
    );
    const { changeUserRole } = require('../src/controllers/admin.controller.js');
    const roleHistoryCheck = typeof changeUserRole === 'function';

    changeRole      ? pass('POST /admin/change-role registered')     : fail('POST /admin/change-role missing');
    roleHistoryCheck ? pass('changeUserRole controller exported')     : fail('changeUserRole not exported');

    // Confirm UserRoleHistory model is accessible
    const historyCount = await prisma.userRoleHistory.count();
    pass(`UserRoleHistory table accessible (${historyCount} records)`);
  } catch (err) {
    fail(`Role change check failed: ${err.message}`);
  }

  section('CAPABILITY CHECK D — Core Admin can finish internship');

  try {
    const adminRouter = require('../src/routes/admin.routes.js');
    const stack = adminRouter.stack || [];

    const finishInternship = stack.some(
      l => l.route?.path === '/finish-internship' &&
           l.route.methods?.post
    );
    const archiveRoute = stack.some(
      l => l.route?.path === '/internship-archive/:internId' &&
           l.route.methods?.put
    );
    const qrRoute = stack.some(
      l => l.route?.path === '/internship-archive/:internId/regenerate-qr' &&
           l.route.methods?.post
    );

    finishInternship ? pass('POST /admin/finish-internship registered') : fail('finish-internship route missing');
    archiveRoute     ? pass('PUT  /admin/internship-archive/:internId registered') : fail('archive upsert route missing');
    qrRoute          ? pass('POST /admin/internship-archive/:internId/regenerate-qr registered') : fail('QR regen route missing');

    // Confirm archive service is loadable
    const { finishInternshipWithArchive, upsertArchive } = require('../src/services/internshipArchiveService.js');
    typeof finishInternshipWithArchive === 'function'
      ? pass('finishInternshipWithArchive service function present')
      : fail('finishInternshipWithArchive missing from service');
    typeof upsertArchive === 'function'
      ? pass('upsertArchive service function present')
      : fail('upsertArchive missing from service');
  } catch (err) {
    fail(`Internship finish check failed: ${err.message}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${LINE}`);
  console.log('  AUDIT SUMMARY');
  console.log(LINE);
  console.log(`  \x1b[32mPASS\x1b[0m  ${totalPass}`);
  console.log(`  \x1b[31mFAIL\x1b[0m  ${totalFail}`);
  console.log(`  Total ${totalPass + totalFail} checks\n`);

  if (totalFail === 0) {
    console.log('  \x1b[32m✓ ALL CHECKS PASSED\x1b[0m\n');
  } else {
    console.log(`  \x1b[31m✗ ${totalFail} CHECK(S) FAILED — review output above\x1b[0m\n`);
  }

  console.log(LINE + '\n');
  process.exit(totalFail > 0 ? 1 : 0);
}

main()
  .catch(err => {
    console.error('\nAudit script crashed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
