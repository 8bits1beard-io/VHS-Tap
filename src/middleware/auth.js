const config = require('../config');

// Simple admin authentication middleware
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="VHS Tap Admin"');
    return res.status(401).json({
      success: false,
      error: { message: 'Authorization header required' }
    });
  }

  // Basic authentication format: "Basic base64(username:password)"
  const base64Credentials = authHeader.split(' ')[1];
  if (!base64Credentials) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid authorization format' }
    });
  }

  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === config.admin.username && password === config.admin.password) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="VHS Tap Admin"');
    res.status(401).json({
      success: false,
      error: { message: 'Invalid credentials' }
    });
  }
}

module.exports = { adminAuth };
