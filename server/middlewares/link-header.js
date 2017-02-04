'use strict';

const URL = require('url');
const formatLinkHeader = require('format-link-header');

/**
 * A little bit hacky middleware for producing Link header.
 *
 * Actually it just replaces a few fields from the original GitHub's header.
 */
module.exports = function linkHeader() {
    return function *(next) {
        yield *next;

        let header = this.state._x_GitHubRel;
        if (header) {
            const url = URL.parse(this.request.href, true);
            delete url.search;  // I hate JS! Not, relly! Why? Wtf?
            for (let k of Object.keys(header)) {
                header[k] = {
                    page: header[k].page,
                    rel: header[k].rel,
                };

                url.query.page = header[k].page;
                if (header[k].per_page) {
                    url.query.per_page = header[k].per_page;
                } else {
                    delete url.query.per_page;
                }

                header[k].url = URL.format(url);
            }

            this.response.append('Link', formatLinkHeader(header));
            delete this.state._x_GitHubRel;
        }
    };
};
