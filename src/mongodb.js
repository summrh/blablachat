const mongoose = require('mongoose');

/**
 * Create mongodb connection client
 *
 * @param {String} url - mongodb url
 * @param {Object} app - express application
 *
 * @returns {Object} configured mongodb connection
 */
const connect = (url, app) => {
    mongoose.connect(url, {
        loggerLevel: process.env.LOG_LEVEL === 'debug' ? 'info' : undefined,
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });

    mongoose.connection
        .on('open', () => {
            const { host, port, name } = mongoose.connection;
            app.logger.info({
                message: `DB connection is open to "mongodb://${host}:${port}/${name}"`,
            }, 'mongodb.connection.open');
        }).on('disconnected', () => {
            app.logger.warn({
                message: 'DB connection was closed',
            }, 'mongodb.connection.disconnected');
        }).on('error', err => {
            app.logger.error({
                message: err.message,
            }, 'mongodb.connection.error');
        });

    mongoose.set('debug', true);

    return mongoose.connection;
};

module.exports = {
    connect,
};
