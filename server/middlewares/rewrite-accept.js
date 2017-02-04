'use strict';

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
    }
}
