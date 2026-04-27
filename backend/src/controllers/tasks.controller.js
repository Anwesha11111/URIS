const { syncTasksFromPlane, detectAndMarkStaleTasks, getTasksOverviewForAllInterns } = require('../services/taskService');
const { generateBlockerAlerts } = require('../services/alertService');
const prisma = require('../utils/prisma');

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

    const filter = {};

    // Status filter — case-insensitive, stored lowercase in DB
    if (status) filter.status = status.toLowerCase();

    // Interns only see their own tasks
    if (!isAdmin) filter.internId = req.user.id;

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

module.exports = { getTasksOverview, getTasks };

async function createTask(req, res, next) {
  try {
    const { title, complexity, internId, planeTaskId, skills = [], deadline } = req.body;

    if (!title || !internId || !planeTaskId) {
      return res.status(400).json({ success: false, message: 'title, internId, and planeTaskId are required', data: null });
    }
    if (typeof complexity !== 'number' || complexity < 0 || complexity > 1) {
      return res.status(400).json({ success: false, message: 'complexity must be a number between 0 and 1', data: null });
    }

    // Ensure intern exists before creating task to avoid FK constraint error
    await prisma.intern.upsert({
      where:  { id: internId },
      update: {},
      create: { id: internId },
    });

    const task = await prisma.task.create({
      data: {
        title,
        complexity,
        internId,
        planeTaskId,
        skills,
        status: 'active',
        progressPct: 0,
        lastUpdatedAt: new Date(),
        ...(deadline ? { deadline: new Date(deadline) } : {}),
      },
    });

    console.log('[INFO] Task created:', task.id);

    return res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTasksOverview, getTasks, createTask };
