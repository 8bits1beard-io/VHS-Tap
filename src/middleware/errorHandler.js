// Global error handler middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error status
  const status = err.status || err.statusCode || 500;

  // Send error response
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

module.exports = errorHandler;
