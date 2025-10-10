const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const database = require('./database/db');
const errorHandler = require('./middleware/errorHandler');
const { adminAuth } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static assets (CSS, JS, images) without auth
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));
app.use('/logo.png', express.static(path.join(__dirname, '../public/logo.png')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Jellyfin NFC VHS Server is running',
    timestamp: new Date().toISOString()
  });
});

// Admin panel - requires authentication
app.get('/', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.use('/api/config', require('./routes/config'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/tapes', require('./routes/tapes'));

// Scan page route (for NFC tags)
app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/scan.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found' }
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    console.log('Database connected');

    // Start listening
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Jellyfin URL: ${config.jellyfin.url}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
