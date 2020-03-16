const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Authenticate user
 *
 * @param {Object} config - auth config
 *
 * @param {Object} req - request data
 * @param {Object} res - response data
 * @param {Function} next - Passes control to the next middleware function
 *
 * @return {Function}
 */
module.exports = (config) => async (req, res, next) => {
    try {
        const { email, password } = req.body;
        delete req.body.password;

        const user = await User.findByEmail(email);
        const isLoggedIn = Boolean(user && await User.passwordCheck(password, user.password));

        if (!isLoggedIn) {
            const err = new Error('Incorrect email or password');
            err.status = 401;
            throw err;
        }

        const { name, role } = user;
        const token = jwt.sign(
            user.toJSON(),
            config.auth.jwtKey,
            { expiresIn: config.auth.expiration }
        );

        const message = `User with email '${email}' has successfully signed in`;
        req.app.logger.info({ message }, 'auth.login.success');

        res.status(200).json({
            user: { email, name, role },
            expires: config.auth.expiration,
            token: `Bearer ${token}`,
            message,
        });
    } catch (err) {
        if (!(err instanceof Error)) {
            err = new Error(`User sign in was failed (${err})`);
        }

        err.event = 'auth.login.failed';
        next(err);
    }
};
