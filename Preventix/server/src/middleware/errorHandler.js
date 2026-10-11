export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found.` } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: { code: 'MODEL_VALIDATION_ERROR', message: 'Stored data failed validation.', details: Object.values(err.errors).map(e => ({ path: e.path, message: e.message })) } });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ error: { code: 'DUPLICATE_RESOURCE', message: `A record with this ${field} already exists.` } });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: { code: 'INVALID_IDENTIFIER', message: 'A supplied identifier or value is invalid.' } });
  }
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({ error: { code: err.code || 'INTERNAL_ERROR', message: status >= 500 ? 'An unexpected server error occurred.' : err.message } });
}
