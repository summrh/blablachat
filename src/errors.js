class ServerError extends Error {
    constructor(message, code, event) {
        super(message);
        this.code = code;
        this.event = event;
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }

    toJSON() {
        return {
            status: this.code,
            message: this.message,
            event: this.event,
        };
    }
}

module.exports = {
    ServerError,
};
