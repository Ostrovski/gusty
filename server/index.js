'use strict';

const koa = require('koa');
const koaRouter = require('koa-router');
const koaValidate = require('koa-validate');
const msgpack = require('msgpack-lite');
const request = require('request');

const GitHubApiClient = require('./github-api-client');
const ApiV1 = require('./api/v1');
const ApiV2 = require('./api/v2');
const errorHandler = require('./middlewares/errors');
const linkHeader = require('./middlewares/link-header');
const respondWith = require('./middlewares/respond-with');
const rewriteAccept = require('./middlewares/rewrite-accept');

const logger = require('winston');
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {'timestamp': true});
logger.emitErrs = true;
logger.level = process.env.LOG_LEVEL || 'warn';

const app = koa();
app.on('error', function(err, ctx) {
    logger.error(_errToString(err));
});
koaValidate(app);

const options = {
    rootEndpoint: process.env.GITHUB_API_ENDPOINT || 'https://api.github.com',
    accessToken: process.env.API_ACCESS_TOKEN,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    cacheMaxSize: process.env.CACHE_MAX_SIZE,
    cacheMaxAge: process.env.CACHE_MAX_AGE
};
if (!(options.accessToken || (options.clientId && options.clientSecret))) {
    logger.warn('Nor API_ACCESS_TOKEN neither OAUTH_CLIENT_ID & OAUTH_CLIENT_SECRET provided');
}
const client = new GitHubApiClient(request, options, logger);
const apiV1 = ApiV1(koaRouter({prefix: '/api/v1'}), client);
const apiV2 = ApiV2(koaRouter({prefix: '/api/v2'}), client);

app
  .use(rewriteAccept({
      '.json': 'application/json',
      '.msgp': 'application/x-msgpack'
  }))
  .use(respondWith({
      'application/json': (b) => b,  // as is
      'application/x-msgpack': msgpack.encode
  }, logger))
  .use(errorHandler())
  .use(linkHeader())
  .use(apiV1.routes())
  .use(apiV1.allowedMethods())
  .use(apiV2.routes())
  .use(apiV2.allowedMethods());

module.exports = app;

// Utils
function _errToString(err) {
    let message = err.message;
    if (err.description) {
        message += '. ' + err.description;
    }
    if (err.stack) {
        message += '\n' + err.stack;
    }
    if (err.cause) {
        message += '\nCaused by: ' + _errToString(err.cause);
    }
    return message;
}
