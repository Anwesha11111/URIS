'use strict';

const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const QRCode = require('qrcode');
const prisma = require('../utils/prisma');

const QR_DIR = process.env.UPLOAD_DIR
  ? path.join(path.resolve(process.env.UPLOAD_DIR), 'verification-qr')
  : process.env.NODE_ENV === 'production'
    ? '/tmp/uploads/verification-qr'
    : path.join(__dirname, '../../uploads/verification-qr');

function getPublicAppBaseUrl() {
  const base = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return base.replace(/\/$/, '');
}

function buildVerificationPath(verificationId) {
  return `/verify/${verificationId}`;
}

function buildPublicVerificationUrl(verificationId) {
  return `${getPublicAppBaseUrl()}${buildVerificationPath(verificationId)}`;
}

async function nextSequentialCode(prefix, year, field) {
  const token = `${prefix}-${year}-`;
  const latest = await prisma.internshipArchive.findFirst({
    where:   { [field]: { startsWith: token } },
    orderBy: { [field]: 'desc' },
    select:  { [field]: true },
  });

  let seq = 1;
  const value = latest?.[field];
  if (value) {
    const match = value.match(new RegExp(`^${prefix}-\\d{4}-(\\d+)$`));
    if (match) seq = parseInt(match[1], 10) + 1;
  }

  return `${token}${String(seq).padStart(4, '0')}`;
}

async function allocateVerificationId(year = new Date().getFullYear()) {
  return nextSequentialCode('VER', year, 'verificationId');
}

async function allocateCertificateNumber(year = new Date().getFullYear()) {
  return nextSequentialCode('STEM', year, 'certificateNumber');
}

/**
 * Generate verification bundle for a new archive record.
 * Public ID: VER-YYYY-0001 | Certificate: STEM-YYYY-0001 | Internal: UUID token
 */
async function generateVerificationBundle() {
  const year = new Date().getFullYear();
  const verificationId = await allocateVerificationId(year);
  const certificateNumber = await allocateCertificateNumber(year);
  const verificationUrl = buildVerificationPath(verificationId);
  const verificationToken = randomUUID();

  return {
    verificationId,
    verificationToken,
    verificationUrl,
    certificateNumber,
    verificationStatus: 'ACTIVE',
    qrGenerated:        false,
    qrImagePath:        null,
  };
}

async function ensureQrDirectory() {
  await fs.mkdir(QR_DIR, { recursive: true });
}

/**
 * Generate QR PNG from the public verification URL and store path on disk.
 */
async function generateAndStoreQr(verificationId, verificationUrl) {
  await ensureQrDirectory();

  const scanUrl = buildPublicVerificationUrl(verificationId);
  const filename = `${verificationId}.png`;
  const absolutePath = path.join(QR_DIR, filename);

  await QRCode.toFile(absolutePath, scanUrl, {
    type:           'png',
    width:          400,
    margin:         2,
    errorCorrectionLevel: 'H',
  });

  return {
    qrGenerated: true,
    qrImagePath: `/uploads/verification-qr/${filename}`,
  };
}

/**
 * Ensure an archive has verification identifiers; allocate if missing (legacy records).
 */
async function ensureVerificationIdentifiers(archive) {
  if (archive.verificationId && archive.verificationUrl && archive.certificateNumber) {
    return {
      verificationId:      archive.verificationId,
      verificationToken:   archive.verificationToken || randomUUID(),
      verificationUrl:     archive.verificationUrl,
      certificateNumber:   archive.certificateNumber,
      verificationStatus:  archive.verificationStatus || 'ACTIVE',
    };
  }
  return generateVerificationBundle();
}

function toPublicVerificationRecord(archive) {
  return {
    verificationId:     archive.verificationId,
    fullName:           archive.fullName,
    department:         archive.department,
    internshipRole:     archive.internshipRole,
    duration:           archive.duration,
    status:             archive.status,
    adminReview:        archive.adminReview,
    verificationStatus: archive.verificationStatus,
  };
}

module.exports = {
  allocateVerificationId,
  allocateCertificateNumber,
  buildVerificationPath,
  buildPublicVerificationUrl,
  generateVerificationBundle,
  generateAndStoreQr,
  ensureVerificationIdentifiers,
  toPublicVerificationRecord,
  getPublicAppBaseUrl,
};
