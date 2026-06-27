/**
 * MaxTA ERP - Centralized Error Handling Middleware
 * Professional error handling with structured responses and logging
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class BusinessRuleError extends AppError {
  constructor(message) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

/**
 * Global error handler middleware - MUST be registered last
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || undefined;

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists';
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist';
  }

  // MySQL cannot delete with foreign key
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409;
    code = 'CANNOT_DELETE';
    message = 'Cannot delete: record is referenced by other records';
  }

  // Log error (only log stack for unexpected errors)
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack || err.message);
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(`[WARN] ${req.method} ${req.path}: ${code} - ${message}`);
  }

  // Send structured response
  const response = {
    error: message,
    code,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

/**
 * Async route handler wrapper - catches async errors and passes to errorHandler
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
