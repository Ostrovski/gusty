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
    }
}

const loggerStub = {debug: () => {}};

describe('GitHub API Client Test Suite', () => {
    const clientOpts = {
        rootEndpoint: 'http://example.com',
        cacheMaxSize: 10,
        cacheMaxAge: 10000
    };

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

    it('should populate items', () => {
        const serverMock = (url) => {
            const id = parseInt(url.split('/').pop());
            return {
                err: null,
                response: {statusCode: 200, headers: {}},
                body: JSON.stringify({id: id, name: `name${id}`})
            };
        };
        const client = new Client(createRequestStub(serverMock), clientOpts, loggerStub);

        const items = [
            {id: 1, url: '/users/1'},
            {id: 3, url: '/users/2'},
            {id: 2, url: '/users/3'}
        ];
        return client.populate(items).then((incomplete) => {
            assert.equal(incomplete.length, 0);
            for (let i of items) {
                assert.equal(i.name, `name${i.id}`);
            }
        });
    });

    it('should populate as many as possible', (done) => {
        done();
    });

    it('should work with empty responses', (done) => {
        done();
    });

    it('should work for errored responses', (done) => {
        done();
    });
});