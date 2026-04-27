const { getAllActiveAlerts, resolveAlert } = require('../services/alertService');

async function getAlerts(req, res) {
  try {
    const alerts = await getAllActiveAlerts();
    res.json({ success: true, message: `${alerts.length} active alert(s).`, data: alerts });
  } catch (err) {
    console.error('[alertsController] getAlerts error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts.', data: null });
  }
}

async function resolveAlertById(req, res) {
  const { id } = req.params;
  try {
    const updated = await resolveAlert(id);
    res.json({ success: true, message: 'Alert resolved.', data: updated });
  } catch (err) {
    console.error('[alertsController] resolveAlertById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to resolve alert.', data: null });
  }
}

module.exports = { getAlerts, resolveAlertById };
