'use strict';

/**
 * Allows to specify `Accept`ed content type for HTTP responses via URLs suffixes.
 *
 * I.e. one can use `/search/users.json` or `/search/users.msgp` instead of providing
 * corresponding `Accept` headers.
 */
module.exports = function rewriteAccess(formats) {
    formats = formats || {};

    return function *(next) {
        const orig = this.path;
        for (let k in formats) {
            if (this.path.endsWith(k)) {
                this.state._x_acceptContentType = formats[k];
                this.path = this.path.slice(0, -k.length);
                break;
            }
        }

        yield* next;

        this.path = orig;
    };
};
