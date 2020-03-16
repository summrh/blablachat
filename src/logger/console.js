const cluster = require('cluster');

// eslint-disable-next-line no-unused-vars
const create = (config) => {
    const methodsToWrap = ['debug', 'error', 'info', 'log', 'warn'];

    const consoleWrapper = methodsToWrap.reduce((logger, funcName) => {
        // Add worker id in the beginning of every message being logged
        logger[funcName] = (...args) =>
            console[funcName](cluster.worker.id, ...args); // eslint-disable-line no-console
        return logger;
    }, {});

    return consoleWrapper;
};

module.exports = {
    create,
};
