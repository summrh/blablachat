const socketio = require('socket.io');
const socketioJwt = require('socketio-jwt');
const amqp = require('amqplib/callback_api');

module.exports = (server, logger, config) => {
    const io = socketio(server);

    // Add JWT processing as socket's middleware
    io.sockets.use(socketioJwt.authorize({
        secret: config.auth.jwtKey,
        handshake: true,
    }));

    /**
     * Connect socket.io server to given RabbitMQ channel
     * @param chan
     */
    const setupSocketIoEventsForChannel = chan => {
        io.sockets.on('connection', socket => {
            socket.on('chat', data => {
                const msgData = JSON.parse(data);
                msgData.user = socket.decoded_token.email;
                msgData.name = socket.decoded_token.name;
                chan.publish('chatExchange', '', Buffer.from(JSON.stringify(msgData)));
            });

            socket.on('join', data => {
                const infoJoined = {
                    action: 'control',
                    user: socket.decoded_token.email,
                    name: socket.decoded_token.name,
                    msg: 'user joined',
                };

                chan.publish('chatExchange', '', Buffer.from(JSON.stringify(infoJoined)), {
                    // Don't store 'user joined' info messages in chat history
                    headers: { 'x-recent-history-no-store': true },
                });
            });

            // Create the new exclusive queue with random name for every socket.io connection
            chan.assertQueue('', { exclusive: true }, (err, q) => {
                if (err) {
                    throw err;
                }

                logger.debug(`Waiting for messages in the new "${q.queue}" queue`);

                chan.bindQueue('', 'chatExchange', '#'); // Listen to all messages in chatExchange
                chan.consume(q.queue, msg => {
                    // logger.debug('Consumed message: ', msg.content.toString());
                    if (msg.content) {
                        socket.emit('chat', msg.content.toString());
                    }
                });
            });
        });
    };

    // Configure RabbitMQ connection
    amqp.connect(config.rabbitmq.url, (err, connection) => {
        if (err) {
            if (err.code === 'ECONNREFUSED') {
                logger.error('Cannot connect to RabbitMQ server. Killing worker.');
                process.exit(0);
            }

            throw err;
        }

        connection.createChannel((err, chan) => {
            if (err) {
                throw err;
            }

            // Use x-recent-history RabbitMQ plugin for chat history implementation:
            chan.assertExchange('chatExchange', 'x-recent-history', {
                durable: false,
                arguments: { 'x-recent-history-length': config.rabbitmq.historyLength },
            });

            setupSocketIoEventsForChannel(chan);
        });
    });
};
