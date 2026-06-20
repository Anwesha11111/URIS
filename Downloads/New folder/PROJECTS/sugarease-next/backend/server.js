const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const dataService = require('./services/dataService');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize DB
dataService.initDb();

// Routes
app.use('/api', apiRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`SugarEase Backend running on http://localhost:${PORT}`);
});
