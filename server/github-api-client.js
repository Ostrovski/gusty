'use strict';

const LRU = require('lru-cache');
const parallelLimit = require('run-parallel-limit');
const parseLinkHeader = require('parse-link-header');
const querystring = require('querystring');

class ApiClient {
    constructor(request, options, logger) {
        this.rootEndpoint = options.rootEndpoint.replace(/\/$/, '');
        this.accessToken = options.accessToken;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.maxConcurrency = options.maxConcurrency || 5;
        this.logger = logger;
        this.headers = {
            'User-Agent': options.userAgent || 'Gusty-Ostrovski-App',
            'Accept': options.accept || 'application/vnd.github.v3+json'
        };
        this.cache = LRU({
            max: options.cacheMaxSize || 1000,
            maxAge: options.cacheMaxAge || 1000*60*10
        });
        this._request = request;
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

    request(url, params) {
        params = params || {};

        return new Promise((resolve, reject) => {
            const req = {
                url: this._url(url, params),
                headers: this.headers
            };

            // Caches works only for URLs without any params - mainly just for simplicity.
            const cacheKey = -1 === url.indexOf('?') ? url : null;
            let cached = null;
            if (cacheKey) {
                cached = this.cache.get(cacheKey);
                if (cached) {
                    req.headers['If-None-Match'] = cached.ETag;
                }
            }

            this._request(req, (err, response, body) => {
                this.logger.debug(
                    `GitHub API request [${req.url}] -> HTTP ${response.statusCode} ${body}`
                );

                if (err) {
                    return reject(_err(500, response, err));
                }
                if (response.statusCode == 200) {
                    return this._handle200(cacheKey, response, body, resolve, reject);
                }
                if (response.statusCode == 304) {
                    return this._handle304(cached, response, resolve, reject);
                }
                reject(_err(500, response, new Error('Unexpected status code')));
            });
        });
    }

    /**
     * Nicely fetches resources trying not to abuse rate limits.
     *
     * Quote from https://developer.github.com/guides/best-practices-for-integrators/:
     * "Make requests for a single user or client ID serially. Do not make requests
     *  for a single user or client ID concurrently.
     *  ...
     *  Check Retry-After header."
     */
    requests(urls) {
        const thunkify = (url) => {
            return (cb) => {
                this.request(url).then((res) => {
                    cb(null, res);
                }).catch(cb);
            };
        };

        return new Promise((resolve, reject) => {
            parallelLimit(urls.map(thunkify), this.maxConcurrency, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    _handle200(cacheKey, response, body, resolve, reject) {
        try {
            let data = JSON.parse(body);
            if (response.headers.link) {
                data = {
                    data: data,
                    rel: parseLinkHeader(response.headers.link)
                };
            }
            if (response.headers.etag && cacheKey) {
                this.cache.set(cacheKey, {ETag: response.headers.etag, data: data});
            }
            resolve(data);
        } catch (e) {
            reject(_err(500, response, e));
        }
    }

    _handle304(cached, response, resolve, reject) {
        if (cached) {
            this.logger.debug('Cache hit! ETag=' + cached.ETag);
            resolve(cached.data);
        } else {
            reject(_err(500, response, new Error('Unexpected cache miss')));
        }
    }

    _url(url, params) {
        params = params || {};
        if (this.clientId && this.clientSecret) {
            params.client_id = this.clientId;
            params.client_secret = this.clientSecret;
        } else if (this.accessToken) {
            params.access_token = this.accessToken;
        }
        if (url.indexOf('http') !== 0) {
            url = this.rootEndpoint + url;
        }
        if (Object.keys(params).length) {
            url += (-1 === url.indexOf('?') ? '?' : '&') + querystring.stringify(params);
        }
        return url;
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
