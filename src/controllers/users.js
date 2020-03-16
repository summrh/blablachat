const nodemailer = require('nodemailer');
const { Router } = require('express');

const User = require('../models/user');
const { ServerError } = require('../errors');
const mdw = require('../mdw');

/**
 * Send password to the new user
 *
 * @param recipient Email to send password to
 * @param password Generated user password
 * @param config
 * @returns {Promise<void>}
 */
async function sendPasswordMail(recipient, password, config) {
    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.mailer.user,
            pass: config.mailer.pass,
        },
    });

    const result = await transport.sendMail({
        from: '"Bla-bla-chat" <no-reply@example.com>',
        to: recipient,
        subject: 'New Bla-bla-chat account',
        text: `Hi there!\n\nYour password: ${password}`,
        html: `Hi there!<br><br><b>Your password:</b> ${password}`,
    });

    return result;
}


/**
 * Create router for users endpoint
 *
 * @param {Object} config - endpoint config
 * @return {Object<Router>} configured express router
 */
module.exports = (config) => {
    const router = Router();
    const adminAccessMdw = [
        mdw.auth(config),
        mdw.role({ roles: ['admin'] }),
    ];

    router.get('/', adminAccessMdw,
        async (req, res, next) => {
            try {
                const includeDeleted = req.query.all === 'true';
                const users = await User.getAll(includeDeleted);

                req.app.logger.info({ includeDeleted }, 'users.get.success');

                res.status(200).json({ users });
            } catch (err) {
                if (!(err instanceof ServerError)) {
                    err = new ServerError(`Getting users was failed (${err.message})`, 500);
                }

                err.event = 'users.get.failed';
                next(err);
            }
        });

    router.post('/', // No auth & role middleware used - anyone is allowed to sign up
        async (req, res, next) => {
            try {
                const { name, email, regions } = req.body;

                if (await User.findByEmail(email, true)) {
                    const err = new ServerError(`User with email '${email}' already exists`, 400);
                    throw err;
                }

                // Generate alfanumeric password
                // E.g., 0.9363515918844729 -> '0.xpif45hzhel' -> 'xpif45hzhel'
                const password = Math.random().toString(10 + 26).substring(2);

                // An account with admin role is created for mailer email only
                const role = (email === config.mailer.user) ? 'admin' : 'user';
                const user = new User({ email, name, password, role, regions });

                const validationError = user.validateSync();
                if (validationError) {
                    validationError.status = 400;
                    throw validationError;
                }

                await User.createUser(user);

                const message = `User '${email}' was successfully registered`;
                req.app.logger.info({ message, password }, 'user.create.success');

                res.status(200).json({ message });

                const result = await sendPasswordMail(email, password, config);

                req.app.logger('Password emailed. Message id: %s', result.messageId);
            } catch (err) {
                if (!(err instanceof ServerError)) {
                    err = new ServerError(`User registration was failed (${err})`, err.status || 500);
                }

                err.event = 'user.create.failed';
                next(err);
            }
        });

    router.put('/', adminAccessMdw,
        async (req, res, next) => {
            try {
                let user = await User.findByEmail(req.body.email);

                if (!user) {
                    const err = new ServerError(
                        `User with email '${req.body.email}' wasn't found`, 404);
                    throw err;
                }

                user = await User.updateUser(user._id, req.body);

                req.app.logger.info({ query: req.query, user }, 'users.put.success');

                res.status(200).json({ user });
            } catch (err) {
                if (!(err instanceof ServerError)) {
                    err = new ServerError(
                        `Saving user was failed (${err})`, 500, 'users.put.failed');
                }

                next(err);
            }
        });

    router.delete('/:userId', adminAccessMdw,
        async (req, res, next) => {
            try {
                const report = await User.deleteUser(req.params.userId);

                req.app.logger.info({ report }, 'users.delete.success');

                res.status(200).json({
                    userId: req.params.userId,
                    report,
                });
            } catch (err) {
                if (!(err instanceof ServerError)) {
                    err = new ServerError(
                        `Deleting user was failed (${err})`, 500, 'users.delete.failed');
                }

                next(err);
            }
        });

    return router;
};
