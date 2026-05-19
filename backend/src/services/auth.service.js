const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { normalizeRole, ROLES } = require('../constants/roles');
const { logAction }      = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');
const { trackActivity }  = require('../utils/activityTracker');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');

const SALT_ROUNDS = 10;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Server cannot start.');
}

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * Roles that are allowed via public self-registration.
 * Admin, lead, and manager roles must be created internally by existing admins.
 */
const PUBLIC_SIGNUP_ROLES = new Set([
  ROLES.TECHNICAL_INTERN,
  ROLES.OPERATIONS_INTERN,
  ROLES.RESEARCH_INTERN,
  ROLES.ORENDA_MEMBER,
]);

async function register({ name, email, password, role }) {
  const prismaRole = normalizeRole(role ?? 'technical_intern');
  if (!prismaRole) {
    const err = new Error(`Invalid role "${role}".`);
    err.status = 400;
    throw err;
  }

  // Enforce public signup restriction — admin/lead roles cannot self-register
  if (!PUBLIC_SIGNUP_ROLES.has(prismaRole)) {
    const err = new Error('This role cannot be created via public registration. Contact an administrator.');
    err.status = 403;
    throw err;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // All new registrations (Admins, Leads, Interns) start as 'pending'.
  // They must be approved by an existing Admin or Lead via the dashboard.
  const status = 'pending';

  // Derive a display name: use the provided name if non-empty, otherwise fall
  // back to the email prefix so existing behaviour is preserved.
  const displayName = (typeof name === 'string' && name.trim())
    ? name.trim()
    : email.split('@')[0];

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name: displayName, role: prismaRole, status },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });

  void logAction(user.id, AUDIT_ACTIONS.REGISTER, AUDIT_ENTITIES.USER, user.id, {
    email:  user.email,
    role:   user.role,
    status: user.status,
  });

  // Pending admin/lead accounts: return no token — they cannot log in until approved.
  if (status === 'pending') {
    return { pending: true, user: { email: user.email, role: user.role.toLowerCase() } };
  }

  // Auto-create an Intern record for intern-role users
  if (prismaRole.includes('INTERN')) {
    // Generate a simple slug from name: "John Doe" -> "john-doe"
    const baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    await prisma.intern.create({ 
      data: { 
        userId: user.id,
        slug: slug
      } 
    });
  }

  const token = jwt.sign(
    {
      id:     user.id,
      email:  user.email,
      role:   user.role,
      teamId: null,   // new registrations have no team yet
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return {
    token,
    user: {
      id:     user.id,
      name:   user.name,
      email:  user.email,
      role:   user.role.toLowerCase(),
      teamId: null,
    },
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login({ email, password, ipAddress = null, userAgent = null }) {
  const user = await prisma.user.findUnique({ where: { email } });

  const invalidErr = new Error('Invalid email or password.');
  invalidErr.status = 401;

  if (!user) {
    // Log failed attempt for unknown email — no userId
    void prisma.loginLog.create({
      data: { email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'unknown_email' },
    }).catch(() => {});
    throw invalidErr;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    void prisma.loginLog.create({
      data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'invalid_password' },
    }).catch(() => {});
    throw invalidErr;
  }

  // Block pending accounts
  if (user.status === 'pending') {
    void prisma.loginLog.create({
      data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'pending_account' },
    }).catch(() => {});
    const pendingErr = new Error('Your account is pending approval. Please wait for a Core Admin to approve your access.');
    pendingErr.status = 403;
    throw pendingErr;
  }

  // Block alumni (Past Employees) from internal dashboard
  if (user.status === 'alumni' || user.role === 'PAST_EMPLOYEE') {
    void prisma.loginLog.create({
      data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'alumni_account' },
    }).catch(() => {});
    const alumniErr = new Error('Your internship has concluded. You no longer have access to the internal dashboard.');
    alumniErr.status = 403;
    throw alumniErr;
  }

  // Phase 6: Block lifecycle-managed accounts
  // inactive → temporarily disabled by admin
  if (user.status === 'inactive') {
    void prisma.loginLog.create({
      data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'inactive_account' },
    }).catch(() => {});
    const inactiveErr = new Error('Your account has been temporarily deactivated. Please contact an administrator.');
    inactiveErr.status = 403;
    throw inactiveErr;
  }

  // archived → soft-archived, access revoked
  if (user.status === 'archived') {
    void prisma.loginLog.create({
      data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'archived_account' },
    }).catch(() => {});
    const archivedErr = new Error('Your account has been archived. Please contact an administrator if you believe this is an error.');
    archivedErr.status = 403;
    throw archivedErr;
  }

  // removed → compliance hold, access permanently revoked
  if (user.status === 'removed') {
    void prisma.loginLog.create({
      data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: false, failReason: 'removed_account' },
    }).catch(() => {});
    const removedErr = new Error('This account is no longer accessible.');
    removedErr.status = 403;
    throw removedErr;
  }

  // Resolve the user's primary team (first active membership) for JWT claim
  const primaryTeam = await prisma.userTeam.findFirst({
    where:   { userId: user.id, leftAt: null },
    orderBy: { joinedAt: 'asc' },
    select:  { teamId: true },
  });

  const token = jwt.sign(
    {
      id:     user.id,
      email:  user.email,
      role:   user.role,
      teamId: primaryTeam?.teamId ?? null,   // Phase 2: team context in JWT
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  const result = {
    token,
    user: {
      id:     user.id,
      name:   user.name || user.email.split('@')[0],  // fallback for legacy rows without a name
      email:  user.email,
      role:   user.role.toLowerCase(),
      teamId: primaryTeam?.teamId ?? null,
    },
  };

  // Fire-and-forget: audit log + activity tracking + login log
  void logAction(user.id, AUDIT_ACTIONS.LOGIN, AUDIT_ENTITIES.USER, user.id, { email: user.email });
  void trackActivity(user.id, ACTIVITY_TYPES.LOGIN);
  void prisma.loginLog.create({
    data: { userId: user.id, email, ipAddress: ipAddress || 'unknown', userAgent, success: true },
  }).catch(() => {});

  return result;
}

module.exports = { register, login };
