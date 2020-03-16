const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { ServerError } = require('../errors');

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

        if (!user) {
            const err = new ServerError(
                `User with email '${req.body.email}' wasn't found`, 404);
            throw err;
        }

        const isLoggedIn = await User.passwordCheck(password, user.password);

        if (!isLoggedIn) {
            const err = new ServerError('Incorrect email or password', 401);
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
        if (!(err instanceof ServerError)) {
            err = new ServerError(
                `User sign in was failed (${err.message})`, 500, 'auth.login.failed');
        }

        next(err);
    }
};
