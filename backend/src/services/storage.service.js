const axios = require('axios');
const prisma = require('../utils/prisma');

// ---------------------------------------------------------------------------
// Nextcloud WebDAV provider
// ---------------------------------------------------------------------------

async function _attemptUpload(url, authHeader, data) {
  await axios.put(url, JSON.stringify(data), {
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Upload JSON data as a file to Nextcloud via WebDAV PUT.
 * Retries once on failure. Tracks result in SyncLog.
 *
 * @param {string}  filename
 * @param {Object}  data
 * @param {string}  [internId] - Optional, used for sync log association
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function uploadToNextcloud(filename, data, internId = null) {
  const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL;
  const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_USERNAME;
  const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD;

  // Validate environment variables
  if (!NEXTCLOUD_URL || !NEXTCLOUD_USERNAME || !NEXTCLOUD_PASSWORD) {
    const message = 'Missing Nextcloud environment variables';
    console.error('[ERROR] Nextcloud sync failed:', message);
    await _logSync(internId, filename, 'FAILED', message);
    return { success: false, message };
  }

  // Ensure URL ends with '/' and construct full WebDAV path
  // NEXTCLOUD_URL should already include: /remote.php/dav/files/{username}
  const baseUrl = NEXTCLOUD_URL.endsWith('/') ? NEXTCLOUD_URL : `${NEXTCLOUD_URL}/`;
  const url = `${baseUrl}${filename}`;
  
  // Create Basic Auth header manually
  const authHeader = 'Basic ' + Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString('base64');

  // Debug logs
  console.log('[Nextcloud] Username  :', NEXTCLOUD_USERNAME);
  console.log('[Nextcloud] Upload URL:', url);
  console.log('[Nextcloud] Filename  :', filename);

  let lastError = null;

  // Attempt upload — retry once on failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await _attemptUpload(url, authHeader, data);

      console.log('[INFO] Nextcloud sync success:', filename);
      await _logSync(internId, filename, 'SUCCESS', null);
      return { success: true };
    } catch (err) {
      lastError = err;
      
      // Log detailed error information
      console.error(`[Nextcloud] Attempt ${attempt} failed:`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.message,
        url: url
      });

      // Don't retry on 403 (permission denied) or 401 (unauthorized)
      if (err.response?.status === 403 || err.response?.status === 401) {
        break;
      }
      
      if (attempt === 1) {
        console.warn('[Nextcloud] Retrying upload...');
      }
    }
  }

  // Determine error message based on status code
  let message = 'Unknown error';
  if (lastError?.response?.status === 403) {
    message = 'Nextcloud permission denied (403 Forbidden)';
  } else if (lastError?.response?.status === 401) {
    message = 'Nextcloud authentication failed (401 Unauthorized)';
  } else if (lastError?.message) {
    message = lastError.message;
  }

  console.error('[ERROR] Nextcloud sync failed:', message);
  await _logSync(internId, filename, 'FAILED', message);
  return { success: false, message };
}

async function _logSync(internId, filename, status, error) {
  try {
    await prisma.syncLog.create({ 
      data: { 
        internId, 
        filename, 
        status, 
        error 
      } 
    });
  } catch (err) {
    console.error('[SyncLog] Failed to write sync log:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Active provider — swap this to change the integration
// ---------------------------------------------------------------------------
const provider = {
  async uploadAvailability(data, internId) {
    return uploadToNextcloud('availability.json', data, internId);
  },
  async uploadPerformance(data, internId) {
    return uploadToNextcloud('performance.json', data, internId);
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function syncAvailability(data, internId) {
  return provider.uploadAvailability(data, internId);
}

async function syncPerformance(data, internId) {
  return provider.uploadPerformance(data, internId);
}

module.exports = { syncAvailability, syncPerformance, uploadToNextcloud };
