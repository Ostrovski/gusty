'use strict';

const LRU = require('lru-cache');
const parseLinkHeader = require('parse-link-header');
const querystring = require('querystring');

class ApiClient {
    // Client ID
    //   13c3a0f567986ae354a5
    // Client Secret
    //   164e5694f2829ba96bca4d050dbcb8555d7c7fb2

    constructor(request, options, logger) {
        this.rootEndpoint = options.rootEndpoint.replace(/\/$/, '');
        this.accessToken = options.accessToken;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.logger = logger;
        this.headers = {
            'User-Agent': options.userAgent || 'Gusty-Ostrovski-App',
            'Accept': options.accept || 'application/vnd.github.v3+json'
        };
        this.cache = LRU({
            max: options.cacheMaxSize || 10000,
            maxAge: options.cacheMaxAge || 1000*60*60
        });
        this._request = request;
    }

    getUser(username) {
        return this.request(`/users/${username}`);
    }

    /**
     * Nicely loads user profiles trying not to abuse rate limits.
     *
     * Quote from https://developer.github.com/guides/best-practices-for-integrators/:
     * "Make requests for a single user or client ID serially. Do not make requests
     *  for a single user or client ID concurrently.
     *  ...
     *  Check Retry-After header."
     */
    getUsers(usernames) {

    }

    searchUsers(lang, options) {
        options = options || {};
        const params = Object.assign(
            {q: `language:"${lang}"`},
            options.sorting || {},
            options.paging || {}
        );
        if (options.type) {
            params.q += ' type:' + options.type;
        }
        return this.request('/search/users', params);
    }

    request(path, params) {
        return new Promise((resolve, reject) => {
            const req = {
                url: this._url(path, params),
                headers: this.headers
            };

            this._request(req, (error, response, body) => {
                this.logger.debug(
                    `GitHub API request [${req.url}] -> HTTP ${response.statusCode} ${body}`
                );

                if (!error && response.statusCode == 200) {
                    try {
                        let data = JSON.parse(body);
                        if (response.headers.link) {
                            data = {
                                data: data,
                                rel: parseLinkHeader(response.headers.link)
                            };
                        }
                        resolve(data);
                    } catch (e) {
                        reject(_err(500, response, e));
                    }
                } else {
                    reject(_err(500, response, error));
                }
            });
        });
    }

    _url(path, params) {
        params = params || {};
        if (this.clientId && this.clientSecret) {
            params.client_id = this.clientId;
            params.client_secret = this.clientSecret;
        } else if (this.accessToken) {
            params.access_token = this.accessToken;
        }
        return `${this.rootEndpoint}${path}?${querystring.stringify(params)}`;
    }
}

function _err(status, response, cause) {
    const err = new Error('GitHub API request failed');
    err.status = status;
    err.description = '';
    if (response && response.statusCode) {
        err.description += `API response status_code=${response.statusCode};`;
    }
    if (cause) {
        err.description += ` cause=${cause};`;
    }
    return err;
}

module.exports = ApiClient;
