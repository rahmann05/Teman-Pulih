const errorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    if (statusCode === 500) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
    }

    res.status(statusCode).json({ error: message });
};

module.exports = { errorHandler };
