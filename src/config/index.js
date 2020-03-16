/**
 * Load environment variables from the .env file
 * for local development
 */
// eslint-disable-next-line global-require
process.env.NODE_ENV === 'testlocal' && require('dotenv').config();

const mongodb = {
    get url() {
        return process.env.MONGO_URL;
    },
};

const socketio = {
    get url() {
        return process.env.SOCKETIO_URL;
    },
};

const rabbitmq = {
    get url() {
        return process.env.RABBITMQ_URL;
    },
    historyLength: 100,
};

const domains = {
    get allowed() {
        return process.env.ALLOWED_DOMAINS
            ? process.env.ALLOWED_DOMAINS.split(',') : [];
    },
};

const auth = {
    get jwtKey() {
        return process.env.JWT_KEY;
    },
    expiration: process.env.JWT_EXPIRATION || '7d',
};

const mailer = {
    get user() {
        return process.env.MAILER_USER;
    },
    get pass() {
        return process.env.MAILER_PASS;
    },
};

const logger = {};

module.exports = {
    mongodb,
    socketio,
    rabbitmq,
    domains,
    auth,
    mailer,
    logger,

    get env() {
        return process.env.NODE_ENV;
    },

    get port() {
        return parseInt(process.env.PORT, 10) || 3000;
    },
};
