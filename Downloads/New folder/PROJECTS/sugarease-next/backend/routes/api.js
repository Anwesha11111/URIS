const express = require('express');
const router = express.Router();
const mlService = require('../services/mlService');
const dataService = require('../services/dataService');
const voiceService = require('../services/voiceService');
const emergencyService = require('../services/emergencyService');

// Heartbeat
router.get('/ping', (req, res) => {
    res.json({ status: 'ok' });
});

// Risk Prediction
router.post('/predict-risk', async (req, res) => {
    try {
        const data = req.body;
        console.log('API RECEIVED DATA:', JSON.stringify(data));
        const result = await mlService.predictRisk(data);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Trend Prediction
router.get('/predict-trends', async (req, res) => {
    try {
        const result = await mlService.predictTrends();
        if (result) {
            res.json(result);
        } else {
            res.status(400).json({ error: 'Not enough data for prediction' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Reading
router.post('/save-reading', async (req, res) => {
    try {
        const data = req.body;
        await dataService.saveEntry(data);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Data
router.get('/data', async (req, res) => {
    try {
        const data = await dataService.getAllData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Voice processing (Keyword extraction)
router.post('/process-voice', (req, res) => {
    try {
        const { text } = req.body;
        const result = voiceService.extractKeywords(text);
        res.json({ text, keywords: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Emergency Contacts
router.get('/emergency-contacts', (req, res) => {
    try {
        const contacts = emergencyService.getContacts();
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/emergency-contacts', (req, res) => {
    try {
        const data = req.body;
        emergencyService.updateContacts(data);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
