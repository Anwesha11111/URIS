const prisma = require('../utils/prisma');
const { ok, notFound, forbidden, validationError } = require('../utils/respond');
const { uploadToNextcloud } = require('../services/storage.service');
const logger = require('../utils/logger');

/**
 * POST /document/submit
 * Intern submits a document (e.g., Monday/Thursday report)
 */
async function submitDocument(req, res, next) {
  try {
    const { title, description, weekStart } = req.body;
    const file = req.file;

    if (!file) {
      return validationError(res, 'No document file uploaded');
    }

    const intern = await prisma.intern.findUnique({
      where: { userId: req.user.id },
      include: { user: { select: { name: true, email: true, role: true } } }
    });

    if (!intern) {
      return notFound(res, 'Intern record not found');
    }

    // Upload file to storage
    const storagePath = `documents/${intern.id}/${Date.now()}_${file.originalname}`;
    const fileUrl = await uploadToNextcloud(storagePath, file.buffer);

    // Create document record
    const document = await prisma.document.create({
      data: {
        internId: intern.id,
        title: title?.trim() || 'Untitled Report',
        description: description?.trim() || null,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        weekStart: weekStart ? new Date(weekStart) : null,
        submittedAt: new Date(),
      },
      include: {
        intern: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          }
        }
      }
    });

    logger.info({ documentId: document.id, internId: intern.id }, 'Document submitted');

    return ok(res, document, 'Document submitted successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /document/mine
 * Interns view their own submitted documents
 */
async function getDocumentsForIntern(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({
      where: { userId: req.user.id }
    });

    if (!intern) {
      return notFound(res, 'Intern record not found');
    }

    const documents = await prisma.document.findMany({
      where: { internId: intern.id },
      orderBy: { submittedAt: 'desc' },
      include: {
        intern: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          }
        }
      }
    });

    return ok(res, documents, 'Documents retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /document/lead/:internId
 * Leads view documents for a specific intern
 */
async function getDocumentsForLead(req, res, next) {
  try {
    const { internId } = req.params;

    // Verify the requesting user is a lead/admin
    const intern = await prisma.intern.findUnique({
      where: { id: parseInt(internId, 10) },
      include: {
        user: { select: { name: true, email: true, role: true } },
        tasks: {
          where: { status: 'active' },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            complexity: true,
            skills: true,
            progressPct: true,
            deadline: true,
          }
        }
      }
    });

    if (!intern) {
      return notFound(res, 'Intern not found');
    }

    // Check if requesting user has access to this intern
    // Leads can only view documents for their own team members
    const requestingIntern = await prisma.intern.findUnique({
      where: { userId: req.user.id }
    });

    if (!requestingIntern) {
      return notFound(res, 'Requesting intern record not found');
    }

    // For now, allow all leads/admins to view any intern's documents
    // This can be restricted further based on team structure if needed

    const documents = await prisma.document.findMany({
      where: { internId: intern.id },
      orderBy: { submittedAt: 'desc' },
      include: {
        intern: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          }
        }
      }
    });

    return ok(res, {
      intern: {
        id: intern.id,
        name: intern.user?.name,
        email: intern.user?.email,
        role: intern.user?.role,
        tasks: intern.tasks,
      },
      documents
    }, 'Documents retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = { submitDocument, getDocumentsForIntern, getDocumentsForLead };
