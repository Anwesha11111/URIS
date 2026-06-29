'use strict';

const { getPublicVerification } = require('../services/internshipArchiveService');
const { ok, notFound } = require('../utils/respond');

async function getVerification(req, res, next) {
  try {
    const { verificationId } = req.params;
    if (!verificationId || !/^VER-\d{4}-\d{4}$/.test(verificationId)) {
      return notFound(res, 'Verification record not found');
    }

    const record = await getPublicVerification(verificationId);
    return ok(res, record, 'Verification record fetched');
  } catch (err) {
    if (err.status === 404) return notFound(res, 'Verification record not found');
    next(err);
  }
}

module.exports = { getVerification };
