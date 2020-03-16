// Global variables to store jwt and unpacked user data from it
let token = sessionStorage.getItem('token') || null;
let userData = JSON.parse(sessionStorage.getItem('userData') || null);

/**
 * Show log in form
 */
function showJoin() {
    $('#channel').hide();
    $('div#user').hide();
    $('#ask').show();
    $('#email').focus();
}

/**
 * Show main chat interface
 */
function showChannel() {
    $('#ask').hide();
    $('#channel').show();
    $('input#message').focus();
}

/**
 * Send /login POST request, get token and connect with it via socket.io
 * @param email
 * @param password
 */
function join(email, password) {
    if (!email || !password) {
        return;
    }

    $.ajax('/login', {
        data: JSON.stringify({ email, password }),
        contentType: 'application/json',
        type: 'POST',
    }).done((data, textStatus, jqXHR) => {
        token = data.token.split(' ')[1]; // Cut off "Bearer "
        sessionStorage.setItem('token', token);
        userData = data.user;
        sessionStorage.setItem('userData', JSON.stringify(userData));

        runSocket();
        showChannel();
    }).fail((jqXHR, textStatus, errorThrown) => {
        alert(JSON.parse(jqXHR.responseText).error || `${textStatus}: ${errorThrown}`);
    });
}

/**
 * Set socket.io client's event processing callbacks
 * @param socket socket.io client instance
 */
function setupSocketEvents(socket) {
    socket.on('connect', () => {
        console.log('connected');
        $('div#user label').text(userData.name);
        $('div#user').show();
    });

    socket.on('disconnect', () => {
        console.log('disconnected');
    });

    socket.on('error', err => {
        console.log(`error: ${err.message}`);

        if (err.code === 'invalid_token') {
            alert(err.message);
            logout();
        }
    });

    const container = $('div#msgs');
    socket.on('chat', msg => {
        const message = JSON.parse(msg);

        const action = message.action;
        const struct = container.find(`li.${action}:first`);

        if (struct.length < 1) {
            console.log('Could not handle: ', message);
            return;
        }

        // Get a new message view from struct template
        const messageView = struct.clone();

        // It's always NOW, kinda zen
        const timeString = (new Date()).toTimeString().split(' ')[0];
        messageView.find('.time').text(timeString);

        // Different types of messages are displayed in different ways
        switch (action) {
        case 'message':
            // Process message with /me command
            if (message.msg.startsWith('/me ')) {
                messageView.find('.user').text(`${message.name} ${message.msg.slice(4)}`);
                messageView.find('.user').css('font-weight', 'bold');
            } else { // Normal chat message
                messageView.find('.user').text(message.name);
                messageView.find('.message').text(`: ${message.msg}`);
            }
            break;
        case 'control':
            // Process messages like "user joined"
            messageView.find('.user').text(message.name);
            messageView.find('.message').text(message.msg);
            messageView.addClass('control');
            break;
        }

        // Highlight own messages
        if (message.user === userData.email) {
            messageView.find('.user').addClass('self');
        }

        // Append to message container and scroll down
        container.find('ul').append(messageView.show());
        container.scrollTop(container.find('ul').innerHeight());
    });
}

/**
 * Run socket.io client and attach it to message input form
 */
function runSocket() {
    // socketIoUrl is defined in ejs
    const socket = io.connect(socketIoUrl, { query: { token } });///
    setupSocketEvents(socket);

    // Send user join message
    socket.emit('join', JSON.stringify({}));

    // When the new chat message is written, send it to server via socket.emit with 'chat' action
    $('#channel form').submit(event => {
        event.preventDefault();
        const input = $(event.currentTarget).find(':input');
        const msg = input.val().trim();
        if (!msg) {
            return;
        }

        socket.emit('chat', JSON.stringify({ action: 'message', msg }));
        input.val('');
    });
}

/**
 * Forget user & token and show log in form
 */
function logout() {
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('token');
    showJoin();
}

/**
 * Main function that runs on page load
 */
$(document).ready(() => {
    if (!token) {
        showJoin();
    } else {
        runSocket();
        showChannel();
    }

    // Join on enter
    $('#ask input').keydown(event => {
        if (event.key === 'Enter') {
            $('#ask a').click();
        }
    });

    // Set join button action
    $('#ask a').click(() => {
        join($('#email').val(), $('#password').val());
    });
});
