// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);
  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

module.exports = { errorHandler };
