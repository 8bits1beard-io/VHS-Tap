require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jellyfin: {
    url: process.env.JELLYFIN_URL || 'http://localhost:8096',
    apiKey: process.env.JELLYFIN_API_KEY
  },
  database: {
    path: process.env.DB_PATH || './vhs_nfc.db'
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'changeme'
  },
  autoPlayback: {
    enabled: process.env.AUTO_PLAYBACK_ENABLED === 'true',
    defaultUserId: process.env.DEFAULT_USER_ID || null,
    autoSelectSession: process.env.AUTO_SELECT_SESSION === 'true'
  }
};
