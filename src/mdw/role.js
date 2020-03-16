/**
 * Setup access according to users role
 *
 * @param {Array<String>} roles - configure middleware to allow access for listed roles
 *
 * @param {Object} req - request data
 * @param {Object} res - response data
 * @param {Function} next - Passes control to the next middleware function
 *
 * @return {Function}
 */
module.exports = ({ roles = [] }) =>
    (req, res, next) => {
        const { email, role } = req.user;

        if (!roles.includes(role)) {
            const error = new Error(
                `User ${email} has '${role}' role and doesn't authorized to perform this action`,
                'auth.unathorized',
                req.user);
            error.status = 403;

            throw error;
        }

        next();
    };
