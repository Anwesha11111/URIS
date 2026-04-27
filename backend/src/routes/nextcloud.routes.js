const express = require('express');
const router = express.Router();
const { uploadToNextcloud } = require('../services/storage.service');

// Test route for Nextcloud integration
router.get('/test-nextcloud', async (req, res) => {
  try {
    const sampleData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Nextcloud WebDAV test upload'
    };

    const result = await uploadToNextcloud('test-upload.json', sampleData);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Nextcloud upload successful',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || 'Nextcloud upload failed',
        data: null
      });
    }
  } catch (error) {
    console.error('[test-nextcloud] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

module.exports = router;
