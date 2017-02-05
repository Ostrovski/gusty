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
        this.maxRetries = options.maxRetries || 5;
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

    /**
     * Populates (inplace) collection of items (users, organizations, repos, etc).
     *
     * It expectes that each item is an object with `url` property.
     *
     * Result contains list of incomplete items ids if any.
     */
    populate(items) {
        let tasks = items.map((i) => ({item: i, retryCnt: 0}));

        return new Promise((resolve, reject) => {
            const _populate = (tasks) => {
                const toBeDone = tasks.filter((t) => !t.done && t.retryCnt < this.maxRetries);
                if (toBeDone.length) {
                    this.requests(toBeDone.map((t) => t.item.url)).then((responses) => {
                        for (let i in responses) {
                            const resp = responses[i];
                            const task = toBeDone[i];
                            if (resp instanceof Error) {
                                task.retryCnt++;
                            } else {
                                Object.assign(task.item, resp.data);
                                task.done = true;
                            }
                        }

                        _populate(tasks)
                    }).catch(reject);
                } else {
                    const incomplete = tasks.filter((t) => !t.done).map((t) => t.item.id);
                    resolve(incomplete);
                }
             };

             _populate(tasks);
        });
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

    /**
     * Makes a request to the GitHub API.
     *
     * URL can be relative or absolute.
     * For requests without query params internal in-memory cache will be used.
     * In case of cache miss there will be a second consequent request without
     * `If-None-Match` header.
     */
    request(url, params) {
        params = params || {};

        return new Promise((resolve, reject) => {
            const req = {
                url: this._url(url, params),
                headers: this.headers
            };

            // Caches works only for URLs without any params - mainly just for simplicity.
            const cacheKey = -1 === url.indexOf('?') ? url : null;
            const cached = cacheKey && this.cache.get(cacheKey);
            if (cached) {
                req.headers['If-None-Match'] = cached.ETag;
            }

            this._request(req, (err, response, body) => {
                this._logRequest(req, err, response, body);

                try {
                    if (err) {
                        return reject(this._handleErr(err));
                    }

                    if (response.statusCode == 200) {
                        const result = this._handle200(response, body);
                        if (response.headers.etag && cacheKey) {
                           this.cache.set(cacheKey, {ETag: response.headers.etag, result: result});
                        }
                        return resolve(result);
                    }

                    if (response.statusCode == 304) {
                        if (cached) {
                            this.logger.debug('Cache hit. ETag=' + cached.ETag);
                            return resolve(cached.result);
                        }

                        // Retry this request but already withot If-None-Match header.
                        this.logger.debug('Unexpected cache miss.');
                        return this.request(url, params).then(resolve).catch(reject);
                    }

                    if (response.statusCode == 401) {
                        return reject(this._handle401(body));
                    }

                    if (response.statusCode == 403) {
                        return reject(this._handle403(response));
                    }

                    if (response.statusCode == 404) {
                        return reject(this._handle404(req));
                    }

                    return reject(this._handle000(response, body));
                } catch (e) {
                    reject(e);
                }
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
     *
     * Size of the resulting array is always equal to the urls.length.
     * Some positions inside this array may contain errors instead of fetched data.
     * It's up to caller to retry failed requests.
     */
    requests(urls) {
        const thunkify = (url) => {
            return (cb) => {
                this.request(url).then((res) => {
                    cb(null, res);
                }).catch((err) => {
                    cb(null, err);
                });
            };
        };

        return new Promise((resolve, reject) => {
            parallelLimit(urls.map(thunkify), this.maxConcurrency, (err, res) => {
                // TODO: assert(!err);
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    _handle200(response, body) {
        const result = {data: _parseJsonResponse(body), rel: {}};
        if (response.headers.link) {
            result.rel = parseLinkHeader(response.headers.link);
        }
        return result;
    }

    _handle401(body) {
        return _err(401, 'Bad credentials', 'GitHub API response: ' + body);
    }

    _handle403(response) {
        let description = '';
        if (response.headers['x-ratelimit-remaining'] == 0) {
            description = 'GitHub API rate limit exceeded.';
            let resetAt = response.headers['x-ratelimit-reset'];
            if (resetAt) {
                description += ' Rate limits will be reset at: ' + resetAt;
            } else if (response.headers['retry-after']) {
                description += ' Retry after ' + response.headers['retry-after'] + ' sec';
            }
        }
        return _err(403, 'Forbidden', description);
    }

    _handle404(request) {
        return _err(404, 'Resource not found', 'GitHub API Resource: ' + request.url);
    }

    _handle000(response, body) {
        return _err(500,
            'Unexpected response',
            `GitHub API response: HTTP ${response.statusCode} ${body}`
        );
    }

    _handleErr(err) {
        return _err(500, 'Request failed', '', err);
    }

    _logRequest(req, err, resp, body) {
        const request = req.url
            + (req.headers['If-None-Match'] ? ` +ETag=${req.headers['If-None-Match']}` : '');
        const response = err
            ? 'error'
            : `HTTP ${(resp || {}).statusCode} ${body}`;
        this.logger.debug(`GitHub API request [${request}] -> ${response}`);
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

function _err(status, message, description, cause) {
    const err = new Error('GitHub API Client Error: ' + message);
    err.expose = true;
    err.status = status;
    err.description = description;
    err.cause = cause;
    return err;
}

function _parseJsonResponse(body) {
    try {
        return JSON.parse(body);
    } catch (e) {
        throw _err(500, 'Cannot parse JSON body', 'Response body: ' + body, e);
    }
}

module.exports = ApiClient;
