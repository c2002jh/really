const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware configurations for different endpoints
 */

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for file uploads
 * 5 uploads per hour per IP
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 upload requests per hour
  message: {
    success: false,
    error: 'Too many file uploads from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Moderate rate limiter for database-heavy operations
 * 30 requests per 15 minutes per IP
 */
const databaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests to this endpoint, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Relaxed rate limiter for read-only operations
 * 200 requests per 15 minutes per IP
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  uploadLimiter,
  databaseLimiter,
  readLimiter,
};
