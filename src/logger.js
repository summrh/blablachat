const cluster = require('cluster');

// eslint-disable-next-line no-unused-vars
module.exports = (config) => {
    const consoleWrapper = {};
    const methodsToWrap = ['debug', 'error', 'info', 'log', 'warn'];

    methodsToWrap.forEach(funcName => {
        // Add worker id in the beginning of every message being logged
        consoleWrapper[funcName] = (...args) => console[funcName](cluster.worker.id, ...args);
    });

    return consoleWrapper;
};
