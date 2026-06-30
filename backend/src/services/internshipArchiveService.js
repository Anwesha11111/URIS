'use strict';

const prisma = require('../utils/prisma');
const { logAction } = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');
const { ROLES } = require('../constants/roles');
const { ALL_WORK_CATEGORIES, ROLE_TO_DEPARTMENT, INTERN_ROLES } = require('../constants/internshipArchive');
const {
  generateVerificationBundle,
  generateAndStoreQr,
  ensureVerificationIdentifiers,
} = require('./verificationEngine');

const INTERNAL_NOTES_ROLES = new Set([
  ROLES.CORE_ADMIN,
  ROLES.OPERATIONS_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
]);

function canViewInternalNotes(role) {
  return INTERNAL_NOTES_ROLES.has(role);
}

function computeDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

  const diffMs   = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const months   = Math.floor(diffDays / 30);
  const days     = diffDays % 30;

  if (months > 0 && days > 0) return `${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months !== 1 ? 's' : ''}`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

async function resolveReportingLead(userId) {
  const memberships = await prisma.userTeam.findMany({
    where:   { userId, leftAt: null },
    select:  { teamId: true, team: { select: { name: true } } },
  });
  if (memberships.length === 0) return null;

  const teamIds = memberships.map(m => m.teamId);
  const leads = await prisma.userTeam.findMany({
    where: {
      teamId: { in: teamIds },
      role:   'lead',
      leftAt: null,
      userId: { not: userId },
    },
    include: { user: { select: { name: true, email: true } } },
    take:    1,
  });

  if (leads.length > 0) {
    return leads[0].user?.name || leads[0].user?.email || null;
  }
  return memberships[0]?.team?.name ?? null;
}

async function buildPrefill(internId) {
  const intern = await prisma.intern.findUnique({
    where:   { id: internId },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, role: true, status: true,
          profilePictureUrl: true, joiningDate: true,
        },
      },
      internshipArchive: true,
    },
  });

  if (!intern) {
    throw Object.assign(new Error('Intern not found'), { status: 404 });
  }
  if (!intern.user) {
    throw Object.assign(new Error('Intern has no linked user account'), { status: 404 });
  }

  const existing = intern.internshipArchive;
  if (existing) {
    return { ...existing, isExisting: true };
  }

  const user = intern.user;
  const internshipRole = INTERN_ROLES.includes(user.role) ? user.role : user.role;
  const reportingLead = await resolveReportingLead(user.id);
  const department = ROLE_TO_DEPARTMENT[user.role] ?? null;
  const startDate = user.joiningDate ?? intern.createdAt;

  return {
    internId,
    fullName:            user.name || user.email.split('@')[0],
    profilePhotoUrl:     user.profilePictureUrl ?? null,
    email:               user.email,
    department,
    reportingLead,
    currentRole:         user.role,
    internshipRole:      internshipRole,
    internshipStartDate: startDate,
    internshipEndDate:   null,
    duration:            null,
    status:              user.status === 'alumni' || user.role === ROLES.PAST_EMPLOYEE ? 'COMPLETED' : 'ACTIVE',
    workCategories:      [],
    keyContributions:    null,
    featuredAchievements: null,
    adminReview:         null,
    performanceRating:   null,
    recommendationStatus: 'NOT_EVALUATED',
    internalNotes:       null,
    verificationId:      null,
    verificationUrl:     null,
    certificateNumber:   null,
    verificationStatus:  'ACTIVE',
    qrGenerated:         false,
    qrImagePath:         null,
    isExisting:          false,
  };
}

function validateWorkCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories.filter(c => ALL_WORK_CATEGORIES.includes(c));
}

function normalizeArchivePayload(payload, { includeInternalNotes = true, isUpdate = false } = {}) {
  const data = {};

  if (payload.fullName !== undefined)            data.fullName = String(payload.fullName).trim();
  if (payload.profilePhotoUrl !== undefined)     data.profilePhotoUrl = payload.profilePhotoUrl || null;
  if (payload.email !== undefined)               data.email = String(payload.email).trim();
  if (payload.department !== undefined)          data.department = payload.department || null;
  if (payload.reportingLead !== undefined)       data.reportingLead = payload.reportingLead || null;
  if (payload.currentRole !== undefined)         data.currentRole = payload.currentRole;
  if (payload.internshipRole !== undefined)      data.internshipRole = payload.internshipRole;
  if (payload.internshipStartDate !== undefined) {
    data.internshipStartDate = payload.internshipStartDate ? new Date(payload.internshipStartDate) : null;
  }
  if (payload.internshipEndDate !== undefined) {
    data.internshipEndDate = payload.internshipEndDate ? new Date(payload.internshipEndDate) : null;
  }
  if (payload.duration !== undefined)            data.duration = payload.duration || null;
  if (payload.status !== undefined)              data.status = payload.status;
  if (payload.workCategories !== undefined)      data.workCategories = validateWorkCategories(payload.workCategories);
  if (payload.keyContributions !== undefined)      data.keyContributions = payload.keyContributions || null;
  if (payload.featuredAchievements !== undefined) data.featuredAchievements = payload.featuredAchievements || null;
  if (payload.adminReview !== undefined)         data.adminReview = payload.adminReview || null;
  if (payload.performanceRating !== undefined)     data.performanceRating = payload.performanceRating || null;
  if (payload.recommendationStatus !== undefined) data.recommendationStatus = payload.recommendationStatus;
  if (includeInternalNotes && payload.internalNotes !== undefined) {
    data.internalNotes = payload.internalNotes || null;
  }
  if (payload.verificationId !== undefined && !isUpdate)      data.verificationId = payload.verificationId || null;
  if (payload.verificationUrl !== undefined && !isUpdate)     data.verificationUrl = payload.verificationUrl || null;
  if (payload.certificateNumber !== undefined)   data.certificateNumber = payload.certificateNumber || null;
  if (payload.verificationStatus !== undefined)  data.verificationStatus = payload.verificationStatus;
  if (payload.qrGenerated !== undefined && !isUpdate)         data.qrGenerated = Boolean(payload.qrGenerated);
  if (payload.qrImagePath !== undefined && !isUpdate)         data.qrImagePath = payload.qrImagePath || null;

  if (data.internshipStartDate && data.internshipEndDate && !payload.duration) {
    data.duration = computeDuration(data.internshipStartDate, data.internshipEndDate);
  }

  return data;
}

function stripSensitiveFields(record, viewerRole) {
  if (!record) return record;
  let result = { ...record };
  delete result.verificationToken;
  if (!canViewInternalNotes(viewerRole)) {
    const { internalNotes, ...rest } = result;
    result = rest;
  }
  return result;
}

function stripInternalNotes(record, viewerRole) {
  return stripSensitiveFields(record, viewerRole);
}

async function upsertArchive(internId, payload, adminId, viewerRole) {
  const intern = await prisma.intern.findUnique({
    where:   { id: internId },
    include: { user: true, internshipArchive: true },
  });
  if (!intern) throw Object.assign(new Error('Intern not found'), { status: 404 });
  if (!intern.user) throw Object.assign(new Error('Intern has no linked user account'), { status: 404 });

  const includeInternal = canViewInternalNotes(viewerRole);
  const isUpdate = Boolean(intern.internshipArchive);
  const data = normalizeArchivePayload(payload, { includeInternalNotes: includeInternal, isUpdate });

  if (!data.fullName && !intern.internshipArchive) {
    const prefill = await buildPrefill(internId);
    Object.assign(data, normalizeArchivePayload(prefill, { includeInternalNotes: includeInternal }));
  }

  if (!data.fullName) {
    throw Object.assign(new Error('fullName is required'), { status: 400 });
  }

  data.updatedById = adminId ?? null;

  let archive;
  if (intern.internshipArchive) {
    archive = await prisma.internshipArchive.update({
      where: { internId },
      data,
    });
    void logAction(adminId, AUDIT_ACTIONS.UPDATE_INTERNSHIP_ARCHIVE, AUDIT_ENTITIES.INTERN, internId, { internId, changes: Object.keys(data) });
  } else {
    const verification = await generateVerificationBundle();
    Object.assign(data, verification);

    archive = await prisma.internshipArchive.create({
      data: {
        ...data,
        internId,
        fullName:       data.fullName,
        email:          data.email || intern.user.email,
        currentRole:    data.currentRole || intern.user.role,
        internshipRole: data.internshipRole || intern.user.role,
        createdById:    adminId ?? null,
      },
    });

    const qr = await generateAndStoreQr(archive.verificationId, archive.verificationUrl);
    archive = await prisma.internshipArchive.update({
      where: { id: archive.id },
      data:  qr,
    });

    void logAction(adminId, AUDIT_ACTIONS.CREATE_INTERNSHIP_ARCHIVE, AUDIT_ENTITIES.INTERN, internId, {
      internId,
      verificationId: archive.verificationId,
    });
  }

  return stripSensitiveFields(archive, viewerRole);
}

async function finishInternshipWithArchive(internId, payload, adminId, viewerRole) {
  const intern = await prisma.intern.findUnique({
    where:   { id: internId },
    include: { user: true, internshipArchive: true },
  });
  if (!intern) throw Object.assign(new Error('Intern not found'), { status: 404 });
  if (!intern.userId) throw Object.assign(new Error('Intern has no linked user account'), { status: 404 });

  if (intern.user.role === ROLES.PAST_EMPLOYEE || intern.user.status === 'alumni') {
    throw Object.assign(new Error('Internship is already completed for this intern.'), { status: 400 });
  }

  const endDate = payload.internshipEndDate
    ? new Date(payload.internshipEndDate)
    : new Date();

  const finishPayload = {
    ...payload,
    internshipEndDate: endDate.toISOString().slice(0, 10),
    currentRole:         ROLES.PAST_EMPLOYEE,
    internshipRole:    payload.internshipRole || intern.user.role,
    status:            'COMPLETED',
  };

  const archive = await upsertArchive(internId, finishPayload, adminId, viewerRole);

  const now = new Date();
  await prisma.$transaction([
    prisma.internshipArchive.update({
      where: { internId },
      data:  { completedAt: now, status: 'COMPLETED', internshipEndDate: endDate },
    }),
    prisma.user.update({
      where: { id: intern.userId },
      data:  { status: 'alumni', role: ROLES.PAST_EMPLOYEE },
    }),
    prisma.userTeam.updateMany({
      where: { userId: intern.userId, leftAt: null },
      data:  { leftAt: now },
    }),
  ]);

  void logAction(adminId, AUDIT_ACTIONS.FINISH_INTERNSHIP, AUDIT_ENTITIES.INTERN, internId, {
    internEmail: intern.user.email,
    internName:  intern.user.name,
    archiveId:   archive.id,
  });

  return stripSensitiveFields(
    await prisma.internshipArchive.findUnique({ where: { internId } }),
    viewerRole,
  );
}

async function regenerateVerificationQr(internId, adminId, viewerRole) {
  const archive = await prisma.internshipArchive.findUnique({ where: { internId } });
  if (!archive) throw Object.assign(new Error('Internship archive not found'), { status: 404 });

  const ids = await ensureVerificationIdentifiers(archive);
  const qr = await generateAndStoreQr(ids.verificationId, ids.verificationUrl);

  const updated = await prisma.internshipArchive.update({
    where: { internId },
    data: {
      ...ids,
      ...qr,
      updatedById: adminId ?? null,
    },
  });

  void logAction(adminId, AUDIT_ACTIONS.UPDATE_INTERNSHIP_ARCHIVE, AUDIT_ENTITIES.INTERN, internId, {
    internId,
    action:         'REGENERATE_QR',
    verificationId: updated.verificationId,
  });

  return stripSensitiveFields(updated, viewerRole);
}

async function getPublicVerification(verificationId) {
  const archive = await prisma.internshipArchive.findUnique({ where: { verificationId } });
  if (!archive) throw Object.assign(new Error('Verification record not found'), { status: 404 });

  const { toPublicVerificationRecord } = require('./verificationEngine');
  return toPublicVerificationRecord(archive);
}

async function getArchiveByInternId(internId, viewerRole) {
  const archive = await prisma.internshipArchive.findUnique({ where: { internId } });
  if (!archive) return null;
  return stripSensitiveFields(archive, viewerRole);
}

async function listArchives(viewerRole, { status = null } = {}) {
  const where = {};
  if (status) where.status = status;

  const archives = await prisma.internshipArchive.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    include: {
      intern: {
        select: {
          user: { select: { status: true } },
        },
      },
    },
  });

  return archives.map(a => stripSensitiveFields(a, viewerRole));
}

module.exports = {
  buildPrefill,
  upsertArchive,
  finishInternshipWithArchive,
  getArchiveByInternId,
  listArchives,
  regenerateVerificationQr,
  getPublicVerification,
  canViewInternalNotes,
  computeDuration,
  stripInternalNotes,
  stripSensitiveFields,
};
