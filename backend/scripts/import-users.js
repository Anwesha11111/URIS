'use strict';

/**
 * import-users.js — Phase 5A bulk user import
 *
 * Imports all 23 rows from Employee sheet (1).xlsx (Sheet1 only).
 * Sheet2 is excluded — it is a changelog with duplicate records.
 *
 * Usage:
 *   node scripts/import-users.js [--dry-run]
 *
 * Flags:
 *   --dry-run   Validates every row and prints the plan without writing
 *               anything to the database.
 *
 * Exit codes:
 *   0  All rows processed (success or skip — no hard failures)
 *   1  One or more rows failed to import
 *
 * Design:
 *  - Skips any email that already exists in the database (idempotent).
 *  - Staff users  → User record, status: 'active', no Intern record.
 *  - Intern users → User record, status: 'active', Intern record auto-created.
 *  - Alumni users → User record, status: 'alumni', role: PAST_EMPLOYEE,
 *                   Intern record created (needed for InternshipArchive later),
 *                   no team assignment.
 *  - Teams are created on first reference (idempotent).
 *  - Team assignment skipped when team is null or "Past".
 *  - Temporary password: Stemonef@2026!
 *    All imported users should reset via /auth/forgot-password on first login.
 *  - Every create/assign is wrapped in a per-row try/catch.
 *    A single row failure never aborts the rest of the import.
 *  - Full audit log written for each created user.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt           = require('bcrypt');

const prisma     = new PrismaClient();
const DRY_RUN    = process.argv.includes('--dry-run');
const SALT_ROUNDS = 10;

// ── Temporary password ────────────────────────────────────────────────────────
// Must satisfy password.service validatePasswordStrength:
//   min 8 chars, ≥2 capitals, ≥1 special character.
const TEMP_PASSWORD = 'Stemonef@2026!';

// ── Team name map: Excel value → canonical DB name ────────────────────────────
// Confirmed by admin during Phase 5A readiness review.
const TEAM_NAME_MAP = {
  'Core':              'Core Team',
  'Operations':        'Operations Team',
  'Steami':            'STEAMI',
  'INVOS':             'Lab INVOS',
  "Founder's office":  "Founder's Office",
  // These resolve to themselves
  'Silvapure':         'Silvapure',
  'HumanON':           'HumanON',
  'Technical':         'Technical',   // will be created if not found
  // Placeholder — no team assignment
  'Past':              null,
};

// ── Import manifest ───────────────────────────────────────────────────────────
// Each row is the authoritative, already-resolved import record.
// Roles have been normalized. Conflicts (Row 9) have been resolved per admin.
// Sheet2 is excluded.
const IMPORT_ROWS = [
  // ── STAFF ──────────────────────────────────────────────────────────────────
  {
    name:   'Vikas',
    email:  'official@stemonef.org',
    phone:  '7607768385',
    role:   'CORE_ADMIN',
    team:   'Core',
    type:   'STAFF',
    notes:  'Primary CORE_ADMIN — official stemonef address',
  },
  {
    name:   'Kajal Jha',
    email:  'kajaljha@stemonef.org',
    phone:  '9987889324',
    role:   'CORE_ADMIN',
    team:   'Core',
    type:   'STAFF',
    notes:  'CORE_ADMIN confirmed by admin',
  },
  {
    name:   'Akshay Ravi',
    email:  'akshay.ravi@stemonef.org',
    phone:  '7303184448',
    role:   'RESEARCH_LEAD',
    team:   'Silvapure',
    type:   'STAFF',
    teamMembershipRole: 'LEAD',
  },
  {
    name:   'Shashi',
    email:  'shashikushwaha@stemonef.org',
    phone:  '7061803944',
    role:   'TECHNICAL_LEAD',
    team:   'Steami',
    type:   'STAFF',
    teamMembershipRole: 'LEAD',
    notes:  'Fixed from "Team member" in v1 file',
  },
  {
    name:   'Harini',
    email:  'harini.rv.opsl@stemonef.org',
    phone:  '9345582521',
    role:   'OPERATIONS_LEAD',
    team:   'Operations',
    type:   'STAFF',
    teamMembershipRole: 'LEAD',
  },
  {
    name:   'Nithin',
    email:  'nksingh-fci-fo@stemonef.org',
    phone:  '9790827049',
    role:   'CORE_ADMIN',
    team:   'Core',
    type:   'STAFF',
  },
  {
    name:   'Gautam',
    email:  'gj-lead-p-gaia@epochs-stemonef.org',
    phone:  '8368001595',
    role:   'RESEARCH_LEAD',
    team:   'Silvapure',
    type:   'STAFF',
    teamMembershipRole: 'LEAD',
    notes:  '@epochs-stemonef.org — status forced active',
  },
  {
    name:   'Rakshna.R',
    email:  'programmanagerrak@gmail.com',
    phone:  '6384717220',
    role:   'OPERATIONS_PROGRAM_MANAGER',
    team:   'Operations',
    type:   'INTERN',
    // OPERATIONS_PROGRAM_MANAGER does not auto-create Intern record.
    // createInternRecord: true forces it so the user appears in intern lists
    // and can be reassigned via the admin UI.
    createInternRecord: true,
    notes:  'PM classified as Intern per admin. Intern record manually forced.',
  },

  // ── INTERN ─────────────────────────────────────────────────────────────────
  {
    name:   'Vishmitha.V.A',
    email:  'vishmithaarupa@gmail.com',
    phone:  '8072285183',
    role:   'RESEARCH_INTERN',
    team:   "Founder's office",
    type:   'INTERN',
  },
  {
    name:   'Shriyanshu Singh',
    email:  'ssh.ep.pg@gmail.com',
    phone:  '9576661823',
    role:   'RESEARCH_INTERN',
    team:   'INVOS',
    type:   'INTERN',
  },
  {
    name:   'ANWESHA',
    email:  'anweshamohapatra11111@gmail.com',
    phone:  '7981719866',
    role:   'TECHNICAL_INTERN',
    team:   'Technical',
    type:   'INTERN',
    notes:  'Team "Technical" will be created if it does not exist',
  },
  {
    name:   'SEETA ANANYA',
    email:  'ananyaseeta.stemonef@gmail.com',
    phone:  '7386603111',
    role:   'TECHNICAL_INTERN',
    team:   'Technical',
    type:   'INTERN',
  },
  {
    name:   'Ishaan Sen',
    email:  'ishaansenres@gmail.com',
    phone:  '7222949347',
    role:   'TECHNICAL_INTERN',
    team:   'Technical',
    type:   'INTERN',
  },
  {
    name:   'Sahil Raj',
    email:  'sahilraj172303@gmail.com',
    phone:  '9267965491',
    role:   'TECHNICAL_INTERN',
    team:   'Technical',
    type:   'INTERN',
  },
  {
    name:   'Vaibhav Singh',
    email:  'programmanagervs@gmail.com',
    phone:  '8925381502',
    role:   'TECHNICAL_INTERN',
    team:   'Technical',
    type:   'INTERN',
  },
  {
    name:   'Priyadarshini Palanirajan',
    email:  'ppr.ep.pg@gmail.com',
    phone:  '9342839614',
    role:   'RESEARCH_INTERN',
    team:   'INVOS',
    type:   'INTERN',
  },
  {
    name:   'Niharika Pandey',
    email:  'np.ep.pg@gmail.com',
    phone:  '8100397809',
    role:   'RESEARCH_INTERN',
    team:   'Silvapure',
    type:   'INTERN',
  },
  {
    name:   'BOPPANA HARSHA VARDHAN RAO',
    email:  'harshavardhanstem1@gmail.com',
    phone:  '9711547112',
    role:   'RESEARCH_INTERN',
    team:   'HumanON',
    type:   'INTERN',
  },
  {
    name:   'Lakshya Luv Mimani',
    email:  'lakshyaluvmimani@proton.me',
    phone:  '7076245448',
    role:   'TECHNICAL_INTERN',
    team:   'Technical',
    type:   'INTERN',
  },

  // ── ALUMNI ─────────────────────────────────────────────────────────────────
  {
    name:   'Subhashis Dash',
    email:  'subhashisdash-eios@epochs-stemonef.org',
    phone:  '9337248252',
    // Role conflict resolved: Type=Past → PAST_EMPLOYEE (was Research Lead in file)
    role:   'PAST_EMPLOYEE',
    team:   null,
    type:   'ALUMNI',
    notes:  'Was listed as Research Lead but Type=Past. Resolved to PAST_EMPLOYEE per admin.',
  },
  {
    name:   'Tarkeshwar Sharma',
    email:  'tarkeshwar.sharma@steami.network',
    phone:  '8839515792',
    role:   'PAST_EMPLOYEE',
    team:   null,
    type:   'ALUMNI',
    notes:  '@steami.network external domain — status forced alumni',
  },
  {
    name:   'Purba Chowdhury',
    email:  'pc.ep.pg@gmail.com',
    phone:  '9674206240',
    role:   'PAST_EMPLOYEE',
    team:   'Silvapure',
    type:   'ALUMNI',
    notes:  'Past Intern — Silvapure team kept for historical record',
  },
  {
    name:   'Shruthi Kumari',
    email:  'shruti.eios.alpha.evt.sil@gmail.com',
    phone:  '9507130924',
    role:   'PAST_EMPLOYEE',
    team:   null,
    type:   'ALUMNI',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves a raw Excel team name to its canonical DB name.
 * Returns null for placeholder values ('Past', null, undefined).
 */
function resolveTeamName(rawTeam) {
  if (!rawTeam) return null;
  const mapped = TEAM_NAME_MAP[rawTeam];
  // If mapped === null explicitly, it's a placeholder — no team
  if (mapped === null) return null;
  // If not in map at all, use as-is (safety net)
  return mapped ?? rawTeam;
}

/**
 * Creates a team if it doesn't already exist.
 * Returns the existing or newly created Team record.
 */
async function ensureTeam(name) {
  const existing = await prisma.team.findUnique({ where: { name } });
  if (existing) return existing;
  console.log(`  [TEAM]   Creating team "${name}"`);
  return prisma.team.create({ data: { name } });
}

/**
 * Determines the user status based on import type and email domain.
 * Alumni are always 'alumni'. Staff/Intern are 'active'.
 * The @stemonef.org activation rule from register() is irrelevant
 * for bulk import — we set status explicitly.
 */
function resolveStatus(type) {
  return type === 'ALUMNI' ? 'alumni' : 'active';
}

/**
 * Determines whether an Intern record should be created for this row.
 * True if: role contains 'INTERN', OR createInternRecord is forced.
 */
function needsInternRecord(row) {
  return row.createInternRecord === true || row.role.includes('INTERN');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = DRY_RUN ? 'DRY RUN' : 'LIVE';

  console.log('\n' + '─'.repeat(80));
  console.log(`  URIS Phase 5A — User Import Script  [${mode}]`);
  console.log(`  Run: ${new Date().toISOString()}`);
  console.log('─'.repeat(80));
  console.log(`  Rows to process : ${IMPORT_ROWS.length}`);
  console.log(`  Temp password   : ${TEMP_PASSWORD}`);
  console.log(`  Dry run         : ${DRY_RUN}`);
  console.log('─'.repeat(80) + '\n');

  // Hash password once — same hash reused for all users
  const hashedPassword = DRY_RUN
    ? '<<dry-run-hash>>'
    : await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS);

  const results = { created: 0, skipped: 0, failed: 0, teamCreated: 0 };
  const failures = [];

  for (const row of IMPORT_ROWS) {
    const label = `${row.email} (${row.name})`;

    try {
      // ── 1. Check for existing email ────────────────────────────────────────
      const existing = await prisma.user.findUnique({ where: { email: row.email } });
      if (existing) {
        console.log(`  [SKIP]   ${label} — email already exists (userId: ${existing.id})`);
        results.skipped++;
        continue;
      }

      if (DRY_RUN) {
        const teamName = resolveTeamName(row.team);
        console.log(`  [DRY]    ${label}`);
        console.log(`           role=${row.role}  status=${resolveStatus(row.type)}  type=${row.type}`);
        console.log(`           team=${teamName ?? 'none'}  internRecord=${needsInternRecord(row)}`);
        if (row.notes) console.log(`           note: ${row.notes}`);
        results.created++;
        continue;
      }

      // ── 2. Create User ─────────────────────────────────────────────────────
      const user = await prisma.user.create({
        data: {
          name:     row.name,
          email:    row.email,
          password: hashedPassword,
          role:     row.role,
          status:   resolveStatus(row.type),
        },
        select: { id: true, email: true, role: true, status: true },
      });

      // ── 3. Create Intern record if needed ──────────────────────────────────
      let internId = null;
      // Create an Intern record for:
      //  - all INTERN-role users (needed for task assignment, scoring, etc.)
      //  - ALUMNI users (needed so InternshipArchive can be created later)
      //  - any row with createInternRecord: true (e.g. Rakshna.R)
      const shouldCreateIntern = needsInternRecord(row) || row.type === 'ALUMNI';
      if (shouldCreateIntern) {
        const intern = await prisma.intern.create({
          data: { userId: user.id },
          select: { id: true },
        });
        internId = intern.id;
      }

      // ── 4. Team assignment ────────────────────────────────────────────────
      const teamName = resolveTeamName(row.team);
      if (teamName) {
        const team = await ensureTeam(teamName);
        if (team.status === 'ACTIVE') {
          const memberRole = row.teamMembershipRole ?? 'MEMBER';
          // joinTeam is idempotent — safe to call even if already a member
          const existingMembership = await prisma.userTeam.findFirst({
            where: { userId: user.id, teamId: team.id, leftAt: null },
          });
          if (!existingMembership) {
            await prisma.userTeam.create({
              data: { userId: user.id, teamId: team.id, role: memberRole },
            });
          }
        }
      }

      // ── 5. Audit log ──────────────────────────────────────────────────────
      await prisma.auditLog.create({
        data: {
          userId:   null,           // system action — no acting user
          action:   'BULK_IMPORT',
          entity:   'USER',
          entityId: user.id,
          metadata: {
            importedEmail:  user.email,
            importedRole:   user.role,
            importedStatus: user.status,
            importType:     row.type,
            teamAssigned:   teamName ?? null,
            internId:       internId ?? null,
            notes:          row.notes ?? null,
          },
        },
      });

      console.log(`  [OK]     ${label}`);
      console.log(`           userId=${user.id}  role=${user.role}  status=${user.status}${internId ? `  internId=${internId}` : ''}${teamName ? `  team="${teamName}"` : ''}`);
      results.created++;

    } catch (err) {
      console.error(`  [FAIL]   ${label}`);
      console.error(`           ${err.message}`);
      results.failed++;
      failures.push({ email: row.email, name: row.name, error: err.message });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('  IMPORT SUMMARY');
  console.log('─'.repeat(80));
  console.log(`  Mode    : ${mode}`);
  console.log(`  Created : ${results.created}`);
  console.log(`  Skipped : ${results.skipped}  (email already exists)`);
  console.log(`  Failed  : ${results.failed}`);

  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    for (const f of failures) {
      console.log(`    ✗  ${f.email} (${f.name}): ${f.error}`);
    }
  }

  if (!DRY_RUN && results.created > 0) {
    console.log('\n  NEXT STEPS:');
    console.log('  1. Send password reset emails to all imported users:');
    console.log('     POST /auth/forgot-password for each email');
    console.log('  2. Assign the "Technical" team interns to a team via Admin Overview → INTERNS tab');
    console.log('  3. Verify Rakshna.R role/type in Admin Overview → INTERNS tab');
    console.log('  4. Create InternshipArchive stubs for 4 ALUMNI rows via');
    console.log('     Admin Overview → finish-internship flow');
  }

  console.log('\n' + '─'.repeat(80) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

main()
  .catch(err => {
    console.error('Import script crashed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
