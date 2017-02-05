'use strict';

/**
 * Global error handler.
 *
 * It catches all the errors and shows them to API users.
 * Errors with `expose == true` property considered as
 * already a user-friendly. Other errors will be replaced
 * with a general message.
 */
module.exports = function createErrorHandler() {
    return function *errorHandler(next) {
        try {
            yield *next;
        } catch (err) {
            this.app.emit('error', err, this);

            this.status = err.status || 500;
            if (err.expose) {
                this.body = {message: err.message};
                if (err.description) {
                    this.body.description = err.description;
                }
                if (err.code !== undefined) {
                    this.body.code = err.code;
                }
            } else {
                this.body = {message: 'internal server error'};
            }
        }
    };
};