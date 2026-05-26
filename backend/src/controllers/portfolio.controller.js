'use strict';

const prisma = require('../utils/prisma');
const { ok: respond, notFound } = require('../utils/respond');

// ── Public portfolio view ─────────────────────────────────────────────────────

async function getPublicPortfolio(req, res, next) {
  const { slug } = req.params;

  // Guard: never crash on literal "undefined" or empty slug
  if (!slug || slug === 'undefined') {
    return notFound(res, 'Portfolio not found');
  }

  try {
    // Try slug first, then fall back to id (for interns without a custom slug)
    const intern = await prisma.intern.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug },
        ],
      },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
        tasks: {
          where:  { status: 'completed' },
          select: { id: true, title: true, complexity: true, skills: true, deadline: true },
        },
      },
    });

    if (!intern) {
      return notFound(res, 'Portfolio not found');
    }

    const effectiveSlug = intern.slug || intern.id;
    const portfolioUrl  = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portfolio/${effectiveSlug}`;

    return respond(res, {
      name:           intern.user?.name  || '',
      email:          intern.user?.email || '',
      role:           intern.user?.role  || '',
      bio:            intern.bio          || '',
      profilePic:     intern.profilePic   || '',
      contactNumber:  intern.contactNumber || '',
      linkedinUrl:    intern.linkedinUrl   || '',
      skills:         intern.skills        ?? [],
      completedTasks: intern.tasks,
      portfolioUrl,
    });
  } catch (err) {
    next(err);
  }
}

// ── Get my portfolio (authenticated intern) ───────────────────────────────────

async function getMyPortfolio(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({
      where:   { userId: req.user.id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!intern) return notFound(res, 'Intern record not found');

    // Auto-assign slug = id if not set yet
    const slug = intern.slug || intern.id;
    if (!intern.slug) {
      await prisma.intern.update({ where: { id: intern.id }, data: { slug } });
    }

    return respond(res, {
      slug,
      bio:           intern.bio           || '',
      profilePic:    intern.profilePic    || '',
      contactNumber: intern.contactNumber || '',
      linkedinUrl:   intern.linkedinUrl   || '',
      skills:        intern.skills        ?? [],
    });
  } catch (err) {
    next(err);
  }
}

// ── Update my portfolio ───────────────────────────────────────────────────────

async function updateMyPortfolio(req, res, next) {
  const { bio, profilePic, contactNumber, linkedinUrl, skills } = req.body;

  try {
    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) return notFound(res, 'Intern record not found');

    const updated = await prisma.intern.update({
      where: { id: intern.id },
      data: {
        ...(bio           !== undefined ? { bio }           : {}),
        ...(profilePic    !== undefined ? { profilePic }    : {}),
        ...(contactNumber !== undefined ? { contactNumber } : {}),
        ...(linkedinUrl   !== undefined ? { linkedinUrl }   : {}),
        ...(Array.isArray(skills)       ? { skills }        : {}),
      },
    });

    return respond(res, {
      slug:          updated.slug          || updated.id,
      bio:           updated.bio           || '',
      profilePic:    updated.profilePic    || '',
      contactNumber: updated.contactNumber || '',
      linkedinUrl:   updated.linkedinUrl   || '',
      skills:        updated.skills        ?? [],
    }, 'Portfolio updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicPortfolio, getMyPortfolio, updateMyPortfolio };
