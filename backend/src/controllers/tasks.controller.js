const { syncTasksFromPlane, detectAndMarkStaleTasks, getTasksOverviewForAllInterns } = require('../services/taskService');
const { generateBlockerAlerts } = require('../services/alertService');
const { validateTaskCreation }  = require('../services/businessRules');
const { ok, created, validationError, businessError, notFound } = require('../utils/respond');
const prisma = require('../utils/prisma');
const { logAction } = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');
const { validatePagination } = require('../utils/validate');

async function getTasksOverview(req, res) {
  try {
    await syncTasksFromPlane();
    const staleCount = await detectAndMarkStaleTasks();
    await generateBlockerAlerts();

    const overview = await getTasksOverviewForAllInterns();

    res.json({
      success: true,
      message: `Tasks overview fetched. ${staleCount} stale task(s) detected.`,
      data: overview
    });
  } catch (err) {
    console.error('[tasksController] getTasksOverview error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch task overview.', data: null });
  }
}

async function getTasks(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const isAdmin = req.user.role === 'ADMIN';

    const paginationErrors = validatePagination({ page, limit, status });
    if (paginationErrors.length > 0) {
      return validationError(res, paginationErrors[0]);
    }

    const filter = {};

    // Status filter — case-insensitive, stored lowercase in DB
    if (status) filter.status = status.toLowerCase();

    // Interns only see their own tasks
    if (!isAdmin) {
      const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
      if (!intern) {
        return notFound(res, 'Intern not found');
      }
      filter.internId = intern.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where:   filter,
        select:  { id: true, title: true, status: true, internId: true, complexity: true, progressPct: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    parseInt(limit),
      }),
      prisma.task.count({ where: filter }),
    ]);

    console.log('[INFO] Tasks fetched:', tasks.length);

    return res.status(200).json({
      success: true,
      data:    tasks,
      meta:    { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { title, complexity, internId, planeTaskId, skills = [], deadline } = req.body;

    // Business-level rules: integer complexity, future deadline, unique planeTaskId, intern exists
    const biz = await validateTaskCreation({ complexity, deadline, planeTaskId, internId });
    if (!biz.ok) {
      return businessError(res, biz.status, biz.message);
    }

    // Intern existence confirmed by validateTaskCreation — safe to create directly
    const task = await prisma.task.create({
      data: {
        title,
        complexity,
        internId,
        planeTaskId,
        skills,
        status:        'active',
        progressPct:   0,
        lastUpdatedAt: new Date(),
        ...(deadline ? { deadline: new Date(deadline) } : {}),
      },
    });

    console.log('[INFO] Task created:', task.id);

    void logAction(req.user?.id ?? null, AUDIT_ACTIONS.CREATE_TASK, AUDIT_ENTITIES.TASK, task.id, {
      title, internId, complexity, planeTaskId,
    });

    return created(res, task, 'Task created');
  } catch (err) {
    next(err);
  }
}

module.exports = { getTasksOverview, getTasks, createTask };
