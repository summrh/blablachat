const cluster = require('cluster');
/**
 * Render main chat page
 *
 * @param {Object} config - config
 *
 * @param {Object} req - request data
 * @param {Object} res - response data
 * @param {Function} next - Passes control to the next middleware function
 *
 * @return {void}
 */
module.exports = (config) => async (req, res, next) => {
    try {
        res.render('index', {
            title: 'Bla-bla-chat',
            server: `Worker #${cluster.worker.id}`,
            socketIoUrl: config.socketio.url,
        });
    } catch (err) {
        if (!(err instanceof Error)) {
            err = new Error(`Getting index was failed (${err})`);
        }

        err.event = 'index.get.failed';
        next(err);
    }
};
