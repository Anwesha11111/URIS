const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { normalizeRole }  = require('../constants/roles');
const { logAction }      = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');
const { trackActivity }  = require('../utils/activityTracker');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');

const SALT_ROUNDS = 10;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Server cannot start.');
}

// ── Register ──────────────────────────────────────────────────────────────────

async function register({ email, password, role }) {
  const prismaRole = normalizeRole(role ?? 'intern');
  if (!prismaRole) {
    const err = new Error(`Invalid role "${role}". Accepted values: intern, admin.`);
    err.status = 400;
    throw err;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role: prismaRole },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  // Auto-create an Intern record for intern-role users so all intern-scoped
  // queries (dashboard, tasks, availability, alerts) work immediately after registration.
  if (prismaRole === 'INTERN') {
    await prisma.intern.create({
      data: { userId: user.id },
    });
  }

  void logAction(user.id, AUDIT_ACTIONS.REGISTER, AUDIT_ENTITIES.USER, user.id, {
    email: user.email,
    role:  user.role,
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return {
    token,
    user: {
      id:    user.id,
      name:  user.email.split('@')[0],
      email: user.email,
      role:  user.role.toLowerCase(),
    },
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  const invalidErr = new Error('Invalid email or password.');
  invalidErr.status = 401;

  if (!user) throw invalidErr;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw invalidErr;

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  const result = {
    token,
    user: {
      id:    user.id,
      name:  user.email.split('@')[0],
      email: user.email,
      role:  user.role.toLowerCase(),
    },
  };

  // Fire-and-forget: audit log + activity tracking
  void logAction(user.id, AUDIT_ACTIONS.LOGIN, AUDIT_ENTITIES.USER, user.id, {
    email: user.email,
  });
  void trackActivity(user.id, ACTIVITY_TYPES.LOGIN);

  return result;
}

module.exports = { register, login };
