const jwt = require('express-jwt');

/**
 * Authenticate user by JWT
 *
 * - validate JWT
 * - check for expiration
 *
 * @param {Object} config - auth config
 *
 * @param {Object} req - request data
 * @param {Object} res - response data
 * @param {Function} next - Passes control to the next middleware function
 *
 * @return {Function}
 */
module.exports = (config) => jwt({ secret: config.auth.jwtKey });
