'use strict';

const {
  buildPrefill,
  upsertArchive,
  finishInternshipWithArchive,
  getArchiveByInternId,
  listArchives,
  regenerateVerificationQr,
} = require('../services/internshipArchiveService');
const { ok, validationError, notFound } = require('../utils/respond');
const { isUUID } = require('../utils/validate');
const { ALL_WORK_CATEGORIES, WORK_CATEGORIES } = require('../constants/internshipArchive');

async function getPrefill(req, res, next) {
  try {
    const { internId } = req.params;
    if (!isUUID(internId)) return validationError(res, 'internId must be a valid UUID');

    const prefill = await buildPrefill(internId);
    const stripped = { ...prefill };
    if (!require('../services/internshipArchiveService').canViewInternalNotes(req.user.role)) {
      delete stripped.internalNotes;
    }
    return ok(res, stripped, 'Prefill data fetched');
  } catch (err) {
    next(err);
  }
}

async function getArchive(req, res, next) {
  try {
    const { internId } = req.params;
    if (!isUUID(internId)) return validationError(res, 'internId must be a valid UUID');

    const archive = await getArchiveByInternId(internId, req.user.role);
    if (!archive) return notFound(res, 'Internship archive not found');
    return ok(res, archive, 'Internship archive fetched');
  } catch (err) {
    next(err);
  }
}

async function listAllArchives(req, res, next) {
  try {
    const { status } = req.query;
    const archives = await listArchives(req.user.role, { status: status || null });
    return ok(res, archives, 'Internship archives fetched');
  } catch (err) {
    next(err);
  }
}

async function updateArchive(req, res, next) {
  try {
    const { internId } = req.params;
    if (!isUUID(internId)) return validationError(res, 'internId must be a valid UUID');

    const archive = await upsertArchive(internId, req.body, req.user?.id ?? null, req.user.role);
    return ok(res, archive, 'Internship archive saved');
  } catch (err) {
    next(err);
  }
}

async function regenerateQr(req, res, next) {
  try {
    const { internId } = req.params;
    if (!isUUID(internId)) return validationError(res, 'internId must be a valid UUID');

    const archive = await regenerateVerificationQr(internId, req.user?.id ?? null, req.user.role);
    return ok(res, archive, 'Verification QR regenerated');
  } catch (err) {
    next(err);
  }
}

async function getWorkCategories(_req, res) {
  return ok(res, { categories: WORK_CATEGORIES, all: ALL_WORK_CATEGORIES }, 'Work categories fetched');
}

module.exports = {
  getPrefill,
  getArchive,
  listAllArchives,
  updateArchive,
  regenerateQr,
  getWorkCategories,
  finishInternshipWithArchive,
};
