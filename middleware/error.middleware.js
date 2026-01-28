export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Gemini API specific errors
  if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
    return res.status(429).json({
      success: false,
      error: 'API quota exceeded. Please try again in a few seconds.',
      code: 'QUOTA_EXCEEDED',
    });
  }

  if (err.status === 503) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable. Please try again.',
      code: 'SERVICE_UNAVAILABLE',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
