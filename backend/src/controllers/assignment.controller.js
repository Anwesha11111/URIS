const { getAssignmentShortlist } = require('../services/assignmentEngine');
const { MOCK_INTERNS } = require('../data/mockInterns');
const prisma = require('../utils/prisma');

const MIN_CAPACITY_THRESHOLD = parseInt(process.env.MIN_CAPACITY_THRESHOLD) || 40;

function getShortlist(req, res, next) {
  try {
    const { task } = req.body;

    if (!task || !Array.isArray(task.requiredSkills)) {
      return res.status(400).json({ success: false, message: 'Missing required field: task.requiredSkills', data: null });
    }

    const rankedInterns = getAssignmentShortlist(task, MOCK_INTERNS);

    return res.status(200).json({
      success: true,
      message: 'Shortlist generated',
      data: rankedInterns,
    });
  } catch (err) {
    next(err);
  }
}

async function assignTask(req, res, next) {
  try {
    const { internId, taskId } = req.body;

    if (!internId || !taskId) {
      return res.status(400).json({ success: false, message: 'internId and taskId are required' });
    }

    // Ensure intern exists to avoid FK constraint errors
    await prisma.intern.upsert({
      where:  { id: internId },
      update: {},
      create: { id: internId },
    });

    // Check task exists
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Capacity check
    const capacityRecord = await prisma.capacityScore.findUnique({ where: { internId } });
    const capacityScore  = (capacityRecord?.finalCapacity ?? 0) * 100;

    if (capacityScore < MIN_CAPACITY_THRESHOLD) {
      console.log('[INFO] Assignment blocked (low capacity):', internId);
      return res.status(400).json({
        success: false,
        message: 'Intern not eligible for assignment due to low capacity',
      });
    }

    await prisma.task.update({
      where: { id: taskId },
      data:  { internId },
    });

    console.log('[INFO] Task assigned:', taskId, '→', internId);

    return res.status(200).json({ success: true, message: 'Task assigned successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getShortlist, assignTask };
