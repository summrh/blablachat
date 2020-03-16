const cluster = require('cluster');
const express = require('express');
const os = require('os');
const net = require('net');
const io = require('./io');

const index = require('./controllers');
const users = require('./controllers/users');
const login = require('./controllers/login');
const mongodb = require('./mongodb');
const logger = require('./logger/console');
const config = require('./config');
const mdw = require('./mdw');

function setupCluster() {
    // Set cluster processes corresponding to logical CPUs number
    const procNum = os.cpus().length;
    const workers = [];
    const log = console;

    // Helper for spawning worker at index i
    const spawn = i => {
        workers[i] = cluster.fork();

        // Restart worker on exit
        // eslint-disable-next-line no-unused-vars
        workers[i].on('exit', (worker, code, signal) => {
            log.log('Respawning worker', i);
            spawn(i);
        });
    };

    for (let i = 0; i < procNum; i += 1) {
        spawn(i);
    }

    // Helper function for getting a worker index based on IP address.
    // This is a hot path so it should be really fast. The way it works
    // is by converting the IP address to a number by removing the dots
    // and semicolons, then compressing it to the number of slots we have.
    const workerIndex = (ip, slotsNum) => {
        let digits = '';
        for (let i = 0, len = ip.length; i < len; i += 1) {
            const digit = Number(ip[i]);

            if (!Number.isNaN(digit)) {
                digits += ip[i];
            }
        }

        return Number(digits) % slotsNum;
    };

    // Create the outside facing server listening on our port
    net.createServer({ pauseOnConnect: true }, connection => {
        // Sticky connection is needed to support socket.io long-polling mode
        // We received a connection and need to pass it to the appropriate
        // worker. Get the worker for this connection's source IP and pass
        // it the connection.
        const worker = workers[workerIndex(connection.remoteAddress, procNum)];
        worker.send('sticky-session:connection', connection);
    }).listen(config.port);
}

if (cluster.isMaster) {
    setupCluster();
} else {
    const app = express();
    app.logger = logger.create(config.logger);
    app.set('view engine', 'ejs');
    app.set('views', './views');

    app.use(mdw.cors({ origin: config.domains.allowed }));
    app.use(express.json());

    app.use(express.static('public'));
    app.use('/signup', express.static('public/signup.html'));

    app.get('/', index(config));
    app.use('/users', users(config));
    app.post('/login', login(config));

    // "Not found" middleware
    app.use((req, res, next) => {
        const error = new Error(`Page ${req.originalUrl} not found`);
        error.status = 404;

        next(error);
    });

    // Error handler middleware with 4 params
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
        req.app.logger.error({
            method: req.method.toLowerCase(),
            path: req.path,
            query: Object.keys(req.query).length ? req.query : undefined,
            body: req.body,
            err: err.toString(),
            message: err.message,
        }, err.event || 'error-handler.error');

        res.status(err.status || 500)
            .json({ error: err.message });
    });

    // Run worker server
    app.server = app.listen(0, () => {
        app.db = mongodb.connect(config.mongodb.url, app);
        app.server.keepAliveTimeout = 0;

        app.logger.info({ message: 'Worker server is running' }, 'server.started');
        io(app.server, app.logger, config);
    });

    // Listen to messages sent from the master and ignore everything else
    process.on('message', (message, connection) => {
        if (message !== 'sticky-session:connection') {
            return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master has sent.
        app.server.emit('connection', connection);

        connection.resume();
    });

    process.on('unhandledRejection', (reason, p) => {
        app.logger.error('Unhandled Rejection at: Promise ', p, reason);
    });

    // Gracefully stop the application
    const stop = () => {
        app.db && app.db.close();
        app.server.close();

        app.logger.info({ message: 'Server is stopped' }, 'server.stopped');

        process.exit(0);
    };

    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
}
