'use strict';

const assert = require('chai').assert;
const Client = require('../server/github-api-client');


function createRequestStub(serverMock) {
    return (url, callback) => {
        let headers = url.headers || {};
        if (typeof url !== 'string') {
            url = url.url;
        }

        setTimeout(() => {
            const response = serverMock(url, headers);
            callback(response.err, response.response, response.body);
        }, 0);
    };
}

function serverMockAlternate() {
    let counter = 0;
    return (url, headers) => {
        if (counter++ % 2 === 0) {
            return {
                err: null,
                response: {statusCode: 200, headers: {}},
                body: JSON.stringify({idx: counter - 1})
            };
        } else {
            return {
                err: new Error(counter - 1)
            };
        }
    };
}

function serverMockFail(error, response, body) {
    return (url, headers) => {
        return {
            err: error || null,
            response: response,
            body: body ? JSON.stringify(body) : ''
        };
    };
}

const loggerStub = {debug: () => {}};

describe('GitHub API Client Test Suite', () => {
    const clientOpts = {
        rootEndpoint: 'http://example.com',
        cacheMaxSize: 10,
        cacheMaxAge: 10000
    };

    describe('Low level requests', () => {
        it('should work for errored responses', () => {
            const serverMock = serverMockFail(new Error());
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            return client.request('/users').catch((err) => {
                assert.equal(err.message, 'GitHub API Client Error: Request failed');
                assert.equal(err.status, 500);
                assert.isOk(err.expose);
            });
        });

        it('should handle rate limits', () => {
            const serverMock = serverMockFail(null, {
                statusCode: 403,
                headers: {'x-ratelimit-remaining': 0, 'x-ratelimit-reset': 123}
            });
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            return client.request('/users').catch((err) => {
                assert.equal(err.message, 'GitHub API Client Error: Forbidden');
                assert.equal(err.description, 'GitHub API rate limit exceeded. Rate limits will be reset at: 123');
                assert.equal(err.status, 403);
                assert.isOk(err.expose);
            });
        });

        it('should utilize ETag header', () => {
            const requests = [];
            const responses = [];
            const etag = 'DEADBEAF';

            const serverMock = (url, headers) => {
                requests.push(headers);

                let response;
                if (headers['If-None-Match'] === etag) {
                    response = {
                        err: null,
                        response: {statusCode: 304, headers: {etag: etag}},
                        body: ''
                    };
                } else {
                    response = {
                        err: null,
                        response: {statusCode: 200, headers: {etag: etag}},
                        body: JSON.stringify({id: 1})
                    };
                }

                responses.push(response);
                return response;
            };
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            return client.request('/users/octocat').then((response) => {
                assert.equal(response.data.id, 1);             // Check that response is correct.
                assert.isNotOk(requests[0]['If-None-Match']);  // Check that request was without cache.
                assert.equal(responses[0].response.statusCode, 200);
                assert.equal(responses[0].response.headers.etag, etag);
                return client.request('/users/octocat').then((response) => {
                    assert.equal(response.data.id, 1);                    // Check that response is correct.
                    assert.equal(requests[1]['If-None-Match'], etag);     // Check that request tries to utilize cache.
                    assert.equal(responses[1].response.statusCode, 304);  // Check that response was really cached.
                    assert.equal(responses[1].response.headers.etag, etag);
                    assert.isNotOk(responses[1].body);
                });
            });
        });

        it('should try to execute all requests', () => {
            const serverMock = serverMockAlternate();
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);

            const urls = ['/users/1', '/users/2', '/users/3', '/users/4', '/users/5'];
            return client.requests(urls).then((responses) => {
                for (let i in responses) {
                    if (i % 2 === 0) {
                        assert.notInstanceOf(responses[i], Error);
                    } else {
                        assert.instanceOf(responses[i], Error);
                    }
                }
            });
        });
    });

    describe('Collections population', () => {
        const serverMock = (url) => {
            const id = parseInt(url.split('/').pop());
            return {
                err: null,
                response: {statusCode: 200, headers: {}},
                body: JSON.stringify({id: id, name: `name${id}`})
            };
        };

        it('should populate empty collection', () => {
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            const items = [];
            return client.populate(items).then((incomplete) => {
                assert.equal(items.length, 0);
                assert.equal(incomplete.length, 0);
            });
        });

        it('should populate items', () => {
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            const items = [
                {id: 1, url: '/users/1'},
                {id: 2, url: '/users/2'},
                {id: 3, url: '/users/3'}
            ];
            return client.populate(items).then((incomplete) => {
                assert.equal(incomplete.length, 0);
                for (let i of items) {
                    assert.equal(i.name, `name${i.id}`);
                }
            });
        });

        it('should populate as many as possible', () => {
            const failures = {2: 3, 3: 10};  // UserId -> #attempt
            const serverMock = (url) => {
                const id = parseInt(url.split('/').pop());
                if (failures[id]) {
                    failures[id]--;
                    return {
                        err: null,
                        response: {statusCode: 404, headers: {}},
                        body: JSON.stringify({message: 'Not found'})
                    };
                }
                return {
                    err: null,
                    response: {statusCode: 200, headers: {}},
                    body: JSON.stringify({id: id, name: `name${id}`})
                };
            };
            const client = new Client(
                createRequestStub(serverMock),
                Object.assign({maxRetries: 5}, clientOpts),
                loggerStub
            );

            const items = [
                {id: 1, url: '/users/1'},
                {id: 2, url: '/users/2'},
                {id: 3, url: '/users/3'}
            ];
            return client.populate(items).then((incomplete) => {
                assert.equal(incomplete.length, 1);
                assert.equal(incomplete[0], 3);
                assert.isOk(items[0].name);
                assert.isOk(items[1].name);
            });
        });
    });

    describe('Users Search', () => {
        it('should work with empty responses', () => {
            const serverMock = () => {
                return {
                    err: null,
                    response: {statusCode: 200, headers: {}},
                    body: JSON.stringify({total_count: 0, incomplete_results: false, items: []})
                }
            };
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            return client.searchUsers('Elixir', {}).then((results) => {
                assert.equal(results.data.items.length, 0);
            });
        });

        it('should have Link header', () => {
            const serverMock = () => {
                return {
                    err: null,
                    response: {
                        statusCode: 200,
                        headers: {
                            link: '<http://example.com/users?lang=c&sort=joined&order=asc&page=2>; rel="next", '
                            + '<http://example.com/users?lang=c&sort=joined&order=asc&page=334>; rel="last"'
                        }
                    },
                    body: JSON.stringify({total_count: 42, incomplete_results: false, items: [{id: 1}]})
                }
            };
            const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);
            return client.searchUsers('Elixir', {}).then((results) => {
                assert.equal(results.data.items.length, 1);
                assert.equal(results.rel.next.page, 2);
                assert.equal(results.rel.last.page, 334);
            });
        });
    });
});