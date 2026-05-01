require('dotenv').config();
const express = require('express');
const cors = require('cors');

const availabilityRoutes = require('./src/routes/availabilityRoutes');
const assignmentRoutes   = require('./src/routes/assignmentRoutes');
const demoRoutes         = require('./src/routes/demoRoutes');
const authRoutes         = require('./src/routes/authRoutes');
const taskRoutes         = require('./src/routes/taskRoutes');
const credibilityRoutes  = require('./src/routes/credibilityRoutes');
const alertRoutes        = require('./src/routes/alertRoutes');
const reviewRoutes       = require('./src/routes/reviewRoutes');
const performanceRoutes  = require('./src/routes/performanceRoutes');
const adminRoutes        = require('./src/routes/admin.routes');
const scoreRoutes        = require('./src/routes/score.routes');
const internRoutes       = require('./src/routes/intern.routes');
const nextcloudRoutes    = require('./src/routes/nextcloud.routes');
const auditLogRoutes     = require('./src/routes/auditLog.routes');
const activityRoutes     = require('./src/routes/activity.routes');
const teamRoutes         = require('./src/routes/team.routes');

const { errorHandler } = require('./src/middleware/error.middleware');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/availability', availabilityRoutes);
app.use('/assign',       assignmentRoutes);
app.use('/demo',         demoRoutes);
app.use('/auth',         authRoutes);
app.use('/tasks',        taskRoutes);
app.use('/credibility',  credibilityRoutes);
app.use('/alerts',       alertRoutes);
app.use('/review',       reviewRoutes);
app.use('/performance',  performanceRoutes);
app.use('/admin',        adminRoutes);
app.use('/score',        scoreRoutes);
app.use('/intern',       internRoutes);
app.use('/audit-logs',   auditLogRoutes);
app.use('/activity',     activityRoutes);
app.use('/teams',        teamRoutes);
app.use('/',             nextcloudRoutes);
app.use(errorHandler);

const prisma = require('./src/utils/prisma');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGINT',  () => prisma.$disconnect().finally(() => server.close()));
process.on('SIGTERM', () => prisma.$disconnect().finally(() => server.close()));

module.exports = app;
