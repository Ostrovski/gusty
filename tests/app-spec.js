'use strict';

const assert = require('chai').assert;
const msgpack = require('msgpack-lite');
const request = require('supertest');
const sinon = require('sinon');

const app = require('../server').callback();
const client = require('../server/github-api-client');


describe('API v1 Test Suite', () => {
    let populateStub;
    let searchStub;

    it('should work', () => {
        populateStub = sinon.stub(client.prototype, 'populate').returns(function* () {
            return [];
        });
        searchStub = sinon.stub(client.prototype, 'searchUsers').returns(function* () {
            return {data: {items: []}};
        });

        return new Promise((resolve) => {
            request(app)
                .get('/api/v1/search/users?lang=JavaScript')
                .expect(200)
                .end((err, res) => {
                    assert.isNotOk(err);
                    const data = JSON.parse(res.text);
                    assert.equal(data.incomplete.length, 0);
                    assert.equal(data.items.length, 0);
                    resolve();
            });
        });
    });

    it('should read Accept header', () => {
        populateStub = sinon.stub(client.prototype, 'populate').returns(function* () {
            return [3];
        });
        searchStub = sinon.stub(client.prototype, 'searchUsers').returns(function* () {
            return {data: {items: [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}, {id: 3}]}};
        });

        return new Promise((resolve) => {
            request(app)
                .get('/api/v1/search/users?lang=JavaScript')
                .set('Accept', 'application/x-msgpack')
                .expect('Content-Type', 'application/x-msgpack')
                .buffer()
                .parse(_binaryParser)
                .end((err, res) => {
                    assert.isNotOk(err);
                    const data = msgpack.decode(res.body);
                    assert.equal(data.incomplete[0], 3);
                    assert.equal(data.items.length, 3);
                    resolve();
            });
        });
    });

    it('should detect Content-Type by URL suffix', () => {
        populateStub = sinon.stub(client.prototype, 'populate').returns(function* () {
            return [3];
        });
        searchStub = sinon.stub(client.prototype, 'searchUsers').returns(function* () {
            return {data: {items: [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}, {id: 3}]}};
        });

        return new Promise((resolve) => {
            request(app)
                .get('/api/v1/search/users.msgp?lang=JavaScript')
                .expect('Content-Type', 'application/x-msgpack')
                .buffer()
                .parse(_binaryParser)
                .end((err, res) => {
                    assert.isNotOk(err);
                    const data = msgpack.decode(res.body);
                    assert.equal(data.incomplete[0], 3);
                    assert.equal(data.items.length, 3);
                    resolve();
            });
        });
    });

    it('should validate query string', () => {
        return new Promise((resolve) => {
            request(app)
                .get('/api/v1/search/users?page=foo')
                .expect(400)
                .end((err, res) => {
                    assert.isNotOk(err);
                    const data = JSON.parse(res.text);
                    assert.equal(data.message, 'bad request params');
                    assert.equal(data.description[0].lang, 'lang can not be empty.');
                    assert.equal(data.description[1].page, 'page is not integer.');
                    resolve();
            });
        });
    });

    it('should show exposable errors from GitHub API client', () => {
        searchStub = sinon.stub(client.prototype, 'searchUsers').returns(function *() {
            const err = new Error('Some error');
            err.status = 403;
            err.expose = true;
            throw err;
        });

        return new Promise((resolve) => {
            request(app)
                .get('/api/v1/search/users?lang=JavaScript')
                .expect(403)
                .end((err, res) => {
                    assert.isNotOk(err);
                    const data = JSON.parse(res.text);
                    assert.equal(data.message, 'Some error');
                    resolve();
            });
        });
    });

    afterEach(() => {
        if (populateStub) {
            populateStub.restore();
        }
        if (searchStub) {
            searchStub.restore();
        }
    });
});

function _binaryParser(res, callback) {
    res.setEncoding('binary');
    res.data = '';
    res.on('data', function(chunk) {
        res.data += chunk;
    });
    res.on('end', function() {
        callback(null, new Buffer(res.data, 'binary'));
    });
}
