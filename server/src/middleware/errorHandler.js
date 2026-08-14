function errorHandler(err, req, res, next) {
  console.error('[Error caught in express]:', err);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误 (Internal Server Error)',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
