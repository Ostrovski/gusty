'use strict';

module.exports = function respondWith(codecs) {
    const supportedFormats = Object.keys(codecs);

    return function *(next) {
        yield *next;

        // Affects only on raw data.
        if (typeof this.body === 'object') {
            const contentType = this.state._x_acceptContentType  // higher priority
                || this.accepts(supportedFormats);

            const codec = codecs[contentType];
            if (codec) {
                this.body = codec(this.body);
                this.response.type = contentType;
            } else {
                // TODO: log
            }
        }
    }
}
