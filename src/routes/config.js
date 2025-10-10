const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * GET /api/config
 * Returns public configuration for the client
 */
router.get('/', (req, res) => {
  res.json({
    jellyfinUrl: config.jellyfin.url
  });
});

module.exports = router;
